import { AppService } from "../app-service";
import { catchError, filter, timeout } from "rxjs/operators";
import { ConnectorConfig } from "./connector-config.model";
import { IpcSyncMessageSender } from "../senders/ipc-sync-message.sender";
import { Logger } from "../logger";
import { WorkerService } from "../worker-service";
import { ActivityComputeWorkerParams } from "../workers/activity-compute.worker";
import { WorkerType } from "../enum/worker-type.enum";
import { Hash } from "../tools/hash";
import FormData from "form-data";
import fs from "fs";
import normalizeUrl from "normalize-url";
import { Environment } from "../environments/environment.interface";
import { HttpClient } from "../clients/http.client";
import { of, ReplaySubject, Subject } from "rxjs";
import pDefer, { DeferredPromise } from "p-defer";
import { UserSettings } from "@elevate/shared/models/user-settings/user-settings.namespace";
import { SyncEvent } from "@elevate/shared/sync/events/sync.event";
import { ConnectorType } from "@elevate/shared/sync/connectors/connector-type.enum";
import { Activity, ActivityStats } from "@elevate/shared/models/sync/activity.model";
import { StoppedSyncEvent } from "@elevate/shared/sync/events/stopped-sync.event";
import { SyncEventType } from "@elevate/shared/sync/events/sync-event-type";
import { AthleteSnapshotResolver } from "@elevate/shared/resolvers/athlete-snapshot.resolver";
import { AthleteSnapshot } from "@elevate/shared/models/athlete/athlete-snapshot.model";
import { ElevateSport } from "@elevate/shared/enums/elevate-sport.enum";
import { Streams } from "@elevate/shared/models/activity-data/streams.model";
import { BareActivity } from "@elevate/shared/models/sync/bare-activity.model";
import BaseUserSettings = UserSettings.BaseUserSettings;

export abstract class BaseConnector {
  protected constructor(
    protected readonly appService: AppService,
    protected readonly environment: Environment,
    protected readonly ipcSyncMessageSender: IpcSyncMessageSender,
    protected readonly workerService: WorkerService,
    protected readonly httpClient: HttpClient,
    protected readonly logger: Logger
  ) {
    this.connectorErrorsReasonsIds = [];
  }

  private static readonly WAIT_FOR_SYNC_STOP_EVENT_TIMEOUT: number = 3000;

  public type: ConnectorType;
  public enabled: boolean;
  public connectorConfig: ConnectorConfig;
  public athleteSnapshotResolver: AthleteSnapshotResolver;
  public isSyncing: boolean;
  public stopRequested: boolean;
  public syncFromDateTime: number;
  public syncEvents$: ReplaySubject<SyncEvent>;

  private readonly connectorErrorsReasonsIds: string[];

  public configure(connectorConfig: ConnectorConfig): this {
    this.connectorConfig = connectorConfig;
    this.athleteSnapshotResolver = new AthleteSnapshotResolver(this.connectorConfig.athleteModel);
    this.syncFromDateTime = Number.isFinite(this.connectorConfig.syncFromDateTime)
      ? this.connectorConfig.syncFromDateTime
      : null;
    this.isSyncing = false;
    this.stopRequested = false;
    return this;
  }

  public abstract sync(): Subject<SyncEvent>;

  public abstract getSourceStats<T>(sport: ElevateSport, source: Partial<T>, streams: Streams): Partial<ActivityStats>;

  public stop(): Promise<void> {
    this.stopRequested = true;
    const stopPromise: DeferredPromise<void> = pDefer();

    if (this.isSyncing) {
      const stopSubscription = this.syncEvents$
        .pipe(filter(syncEvent => syncEvent.type === SyncEventType.STOPPED))
        .pipe(
          timeout(BaseConnector.WAIT_FOR_SYNC_STOP_EVENT_TIMEOUT),
          catchError(() => {
            // Timeout for waiting a stop event reached, we have to emulated it...
            this.logger.warn("Request timed out after waiting for stop event from connector. Emulating one");
            this.isSyncing = false;
            this.syncEvents$.next(new StoppedSyncEvent(this.type));
            return of(null);
          })
        )
        .subscribe(() => {
          stopSubscription.unsubscribe();
          this.stopRequested = false;
          stopPromise.resolve();
        });
    } else {
      this.stopRequested = false;
      stopPromise.reject(this.type + " connector is not syncing currently.");
    }

    return stopPromise.promise;
  }

  public findLocalActivities(activityStartDate: string, activityEndDate: string): Promise<Activity[]> {
    return this.ipcSyncMessageSender.findLocalActivities(activityStartDate, activityEndDate);
  }

  public findStreams(activityId: number | string): Promise<Streams> {
    return this.ipcSyncMessageSender.findDeflatedActivityStreams(activityId).then(deflated => {
      if (deflated) {
        return Promise.resolve(Streams.inflate(deflated.deflatedStreams));
      } else {
        return Promise.resolve(null);
      }
    });
  }

  private generateActivityId(bareActivity: BareActivity): string {
    return Hash.asObjectId(
      `${new Date().toISOString()}:${bareActivity.startTime}:${bareActivity.endTime}:${Math.random()}`
    );
  }

  protected assignBaseProperties(activity: Partial<Activity>, streams: Streams): Partial<Activity> {
    // Generate activity id
    activity.id = this.generateActivityId(activity as BareActivity);

    // Track connector type
    activity.connector = this.type;

    // Set created activity dates
    const now = new Date().toISOString();
    activity.creationTime = now;
    activity.lastEditTime = now;

    // Sport type not detected (not supported yet)
    activity.autoDetectedType = false;

    // If swim activity and no position data, it's considered as a pool swim activity
    if (Activity.isSwim(activity.type)) {
      activity.isSwimPool = !streams?.latlng?.length;
    }

    return activity;
  }

  public computeActivity(
    activity: Partial<Activity>,
    athleteSnapshot: AthleteSnapshot,
    userSettings: BaseUserSettings,
    streams: Streams,
    deflateStreams: boolean
  ): Promise<{ computedActivity: Activity; deflatedStreams: string | null }> {
    const workerParams: ActivityComputeWorkerParams = {
      activity: activity,
      athleteSnapshot: athleteSnapshot,
      userSettings: userSettings,
      streams: streams,
      deflateStreams: deflateStreams,
      returnPeaks: true,
      returnZones: false,
      bounds: null,
      isOwner: true,
      activityEssentials: null
    };

    return this.workerService.exec<
      ActivityComputeWorkerParams,
      { computedActivity: Activity; deflatedStreams: string | null }
    >(WorkerType.ACTIVITY_COMPUTE, workerParams);
  }

  public uploadToConnectorDebug(
    connectorSubPath: string,
    fileType: string,
    reason: string,
    pathToFile: string,
    activityId: number | string = null
  ): void {
    if (!this.environment.debugActivityFiles.enabled) {
      this.logger.debug(`Skip uploading file ${pathToFile} for debug`);
      return;
    }

    this.logger.info(`Uploading file ${pathToFile} for debug`);

    // Construct url
    const requestUrl = normalizeUrl(`${this.environment.debugActivityFiles.endpoint}/connectors/${connectorSubPath}`);

    // Prepare multi-part form
    const formData = new FormData();
    formData.append("fileType", fileType);
    formData.append("machineId", this.appService.getRuntimeInfo().athleteMachineId);
    formData.append("reason", reason);
    formData.append("file", fs.createReadStream(pathToFile));

    if (activityId) {
      formData.append("activityId", activityId);
    }

    // Push
    this.httpClient
      .post(requestUrl, formData, { headers: formData.getHeaders() })
      .then(() => {
        this.logger.info(`Uploaded ${pathToFile} file for debug. Reason: ${reason}`);
      })
      .catch(err => {
        this.logger.error(
          `Unable to upload file ${pathToFile} to ${requestUrl} for debugging purpose: ${err.message}`,
          err
        );
      });
  }

  protected uploadActivityInError(
    connectorType: ConnectorType,
    sport: string,
    fileType: string,
    source: string,
    reason: string,
    pathToFile: string,
    activityId: number | string = null
  ): void {
    const reasonJson = JSON.stringify({
      source: source,
      reason: reason,
      fileType: fileType,
      sport: sport
    });

    const reasonHashId = Hash.asObjectId(reasonJson);

    // Test if an activity with same error has been already uploaded.
    // If not send the files and track reason hash
    // Else don't upload
    if (this.connectorErrorsReasonsIds.indexOf(reasonHashId) === -1) {
      this.uploadToConnectorDebug(`${connectorType.toLowerCase()}/error`, fileType, reasonJson, pathToFile, activityId);
      this.connectorErrorsReasonsIds.push(reasonHashId);
    }
  }
}
