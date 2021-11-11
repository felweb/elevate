// tslint:disable:variable-name
import { BareActivity } from "./bare-activity.model";
import { ZoneModel } from "../zone.model";
import _ from "lodash";
import { ActivityFileType } from "../../sync/connectors/activity-file-type.enum";
import { AthleteSnapshot } from "../athlete/athlete-snapshot.model";
import { ConnectorType } from "../../sync/connectors/connector-type.enum";
import { ElevateSport } from "../../enums/elevate-sport.enum";

export class ActivityStats {
  public distance: number;
  public elevationGain: number;
  public elapsedTime: number;
  public movingTime: number;
  public pauseTime: number;
  public moveRatio: number;
  public calories: number;
  public caloriesPerHour: number;
  public scores: Scores;
  public speed: SpeedStats;
  public pace: PaceStats;
  public power: PowerStats;
  public heartRate: HeartRateStats;
  public cadence: CadenceStats;
  public grade: GradeStats;
  public elevation: ElevationStats;
  public dynamics?: DynamicsStats;
}

export class SpeedStats implements Peaks {
  public avg: number;
  public max: number;
  public best20min: number;
  public lowQ: number;
  public median: number;
  public upperQ: number;
  public stdDev: number;
  public zones: ZoneModel[];
  public peaks: Peak[];
}

export class PaceStats {
  public avg: number;
  public gapAvg: number;
  public max: number;
  public best20min: number;
  public lowQ: number;
  public median: number;
  public upperQ: number;
  public stdDev: number;
  public zones: ZoneModel[];
}

export class PowerStats implements Peaks {
  public avg: number;
  public avgKg: number;
  public weighted: number;
  public weightedKg: number;
  public max: number;
  public work: number;
  public best20min: number;
  public variabilityIndex: number;
  public intensityFactor: number;
  public lowQ: number;
  public median: number;
  public upperQ: number;
  public stdDev: number;
  public zones: ZoneModel[];
  public peaks: Peak[];
}

export class HeartRateStats implements Peaks {
  public avg: number;
  public max: number;
  public avgReserve: number;
  public maxReserve: number;
  public best20min: number;
  public best60min: number;
  public lowQ: number;
  public median: number;
  public upperQ: number;
  public stdDev: number;
  public zones: ZoneModel[];
  public peaks: Peak[];
}

export class CadenceStats implements Peaks {
  public avg: number;
  public max: number;
  public avgActive: number;
  public activeRatio: number;
  public activeTime: number;
  public cycles: number;
  public distPerCycle: number;
  public lowQ: number;
  public median: number;
  public upperQ: number;
  public slope: SlopeStats;
  public stdDev: number;
  public zones: ZoneModel[];
  public peaks: Peak[];
}

export class GradeStats implements Peaks {
  public avg: number;
  public max: number;
  public min: number;
  public lowQ: number;
  public median: number;
  public upperQ: number;
  public stdDev: number;
  public slopeTime: SlopeStats;
  public slopeSpeed: SlopeStats;
  public slopeDistance: SlopeStats;
  public slopeCadence: SlopeStats;
  public slopeProfile: SlopeProfile;
  public zones: ZoneModel[];
  public peaks: Peak[];
}

export class ElevationStats {
  public avg: number;
  public max: number;
  public min: number;
  public ascent: number;
  public descent: number;
  public ascentSpeed: number;
  public lowQ: number;
  public median: number;
  public upperQ: number;
  public stdDev: number;
  public elevationZones: ZoneModel[];
}

export interface LeftRightPercent {
  left: number;
  right: number;
}

export class DynamicsStats {
  public cycling?: CyclingDynamicsStats;
  public running?: RunningDynamicsStats;
}

export class CyclingDynamicsStats {
  public standingTime: number;
  public seatedTime: number;
  public balance: LeftRightPercent;
  public pedalSmoothness: LeftRightPercent;
  public torqueEffectiveness: LeftRightPercent;
}

export class RunningDynamicsStats {
  public stanceTimeBalance: LeftRightPercent;

  public stanceTime: number;
  public verticalOscillation: number;
  public verticalRatio: number;
  public avgStrideLength: number;
}

export class TrainingEffect {
  public aerobic?: number;
  public anaerobic?: number;
}

export class Scores {
  public stress: StressScores;
  public runPerfIndex?: number;
  public swolf?: { 25?: number; 50?: number };
}

/**
 * Stress score are re-calculable
 */
export class StressScores {
  /**
   * Heart rate stress score
   */
  hrss: number;
  hrssPerHour: number;

  /**
   * Training impulse
   */
  trimp: number;
  trimpPerHour: number;

  /**
   * Running stress score
   */
  rss: number;
  rssPerHour: number;

  /**
   * Swim stress score
   */
  sss: number;
  sssPerHour: number;

  /**
   * Power stress score
   */
  pss: number;
  pssPerHour: number;

  /**
   * FirstBeat Training Effect
   * https://www.firstbeat.com/en/blog/how-to-use-training-effect/
   */
  trainingEffect?: TrainingEffect;
}

export interface Lap {
  id: number;
  active: boolean;
  indexes: number[];
  distance?: number;
  elevationGain?: number;
  elapsedTime?: number;
  movingTime?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgPace?: number;
  maxPace?: number;
  avgCadence?: number;
  avgHr?: number;
  maxHr?: number;
  avgWatts?: number;
  swolf25m?: number;
  swolf50m?: number;
  calories?: number;
}

export enum SlopeProfile {
  FLAT = "FLAT",
  HILLY = "HILLY"
}

export interface Peak {
  range: number;
  result: number;
}

export interface Peaks {
  peaks: Peak[];
}

export interface SlopeStats {
  up: number;
  flat: number;
  down: number;
  total?: number;
}

export interface MoveStats {
  movingTime: number;
  speed: SpeedStats;
  pace: PaceStats;
}

export interface ActivityExtras {
  strava?: {
    activityId: number;
  };
  file?: { path: string; type: ActivityFileType };
}

export class Activity extends BareActivity {
  /**
   * Athlete snapshot of the activity
   */
  public athleteSnapshot: AthleteSnapshot;

  /**
   * Activity stats kept from source (strava, file, ...)
   */
  public srcStats?: Partial<ActivityStats>;

  /**
   * Activity stats
   */
  public stats: ActivityStats;

  /**
   * Activity laps
   */
  public laps: Lap[];

  /**
   * Pool swim or open water activity
   */
  public isSwimPool?: boolean;

  /**
   * Source of the connector
   */
  public connector?: ConnectorType;

  /**
   * Barycenter of the activity
   */
  public latLngCenter?: number[];

  /**
   * Unique finger print of the activity
   */
  public hash: string;

  /**
   * Tell if athlete settings are missing to compute all stats of the activity
   */
  public settingsLack?: boolean;

  /**
   * Creation date of activity in database
   */
  public creationTime: string;

  /**
   * Last edit date of the activity in database
   */
  public lastEditTime: string;

  /**
   * The device source of the activity (Garmin Edge, Garmin Forerunner, ...)
   */
  public device: string;

  /**
   * Activity notes
   */
  public notes: string;

  /**
   * Tell if sport type has been automatically detected (because source type was unknown/other)
   */
  public autoDetectedType: boolean;

  public extras?: ActivityExtras = {};

  public static isSame(activity: Activity, other: Activity): boolean {
    return JSON.stringify(activity) === JSON.stringify(other);
  }

  public static isRide(activityType: ElevateSport, allowElectric = false): boolean {
    return (
      activityType === ElevateSport.Ride ||
      activityType === ElevateSport.VirtualRide ||
      (activityType === ElevateSport.EBikeRide && allowElectric)
    );
  }

  public static isRun(activityType: ElevateSport): boolean {
    return activityType === ElevateSport.Run || activityType === ElevateSport.VirtualRun;
  }

  public static isWalkHike(activityType: ElevateSport): boolean {
    return activityType === ElevateSport.Hike || activityType === ElevateSport.Walk;
  }

  public static isByFoot(activityType: ElevateSport): boolean {
    return Activity.isRun(activityType) || Activity.isWalkHike(activityType);
  }

  public static isSwim(activityType: ElevateSport): boolean {
    return activityType === ElevateSport.Swim;
  }

  public static isPaced(activityType: ElevateSport): boolean {
    return Activity.isByFoot(activityType) || Activity.isSwim(activityType);
  }

  public static applySourceStats(activity: Activity, sourceStats: ActivityStats, stats: ActivityStats): void {
    activity.srcStats = sourceStats;
    activity.stats = _.merge(_.cloneDeep(stats), sourceStats);
  }
}
