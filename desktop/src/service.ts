import { IpcMainMessagesService } from "./listeners/ipc-main-messages-service";
import { BaseConnector } from "./connectors/base.connector";
import { HttpClient } from "typed-rest-client/HttpClient";
import os from "os";
import { machineIdSync } from "node-machine-id";
import { RuntimeInfo } from "@elevate/shared/electron";
import crypto from "crypto";
import { app } from "electron";
import path from "path";
import { Platform } from "@elevate/shared/enums";

export class Service {
  private static _instance: Service = null;
  private _httpProxy: string;
  private _machineId: string;
  private _runtimeInfo: RuntimeInfo;

  constructor() {
    this._ipcMainMessages = null;
    this._httpProxy = null;
    this._currentConnector = null;
    this._machineId = null;
    this._runtimeInfo = null;
  }

  private _ipcMainMessages: IpcMainMessagesService;

  get ipcMainMessages(): IpcMainMessagesService {
    return this._ipcMainMessages;
  }

  set ipcMainMessages(value: IpcMainMessagesService) {
    this._ipcMainMessages = value;
  }

  private _httpClient: HttpClient;

  get httpClient(): HttpClient {
    return this._httpClient;
  }

  set httpClient(value: HttpClient) {
    this._httpClient = value;
  }

  private _currentConnector: BaseConnector;

  get currentConnector(): BaseConnector {
    return this._currentConnector;
  }

  set currentConnector(value: BaseConnector) {
    this._currentConnector = value; // TODO Test if currentConnector is in syncing before set anything!!
  }

  private _isPackaged: boolean;

  get isPackaged(): boolean {
    return this._isPackaged;
  }

  set isPackaged(value: boolean) {
    this._isPackaged = value;
  }

  public static instance(): Service {
    if (!Service._instance) {
      Service._instance = new Service();
    }
    return Service._instance;
  }

  public getResourceFolder(): string {
    return path.dirname(app.getAppPath());
  }

  public isWindows(): boolean {
    return this.getRuntimeInfo().osPlatform.name === Platform.WINDOWS;
  }

  public isLinux(): boolean {
    return this.getRuntimeInfo().osPlatform.name === Platform.LINUX;
  }

  public isMacOS(): boolean {
    return this.getRuntimeInfo().osPlatform.name === Platform.MACOS;
  }

  public getRuntimeInfo(): RuntimeInfo {
    if (!this._runtimeInfo) {
      const osPlatform = { name: os.platform(), arch: os.arch() };
      const osHostname = os.hostname().trim();
      const osUsername = os.userInfo().username.trim();
      const osMachineId = machineIdSync();
      const athleteMachineId = crypto
        .createHash("sha1")
        .update(osMachineId + ":" + osUsername)
        .digest("hex");
      const cpuName = { name: os.cpus()[0].model.trim(), threads: os.cpus().length };
      const memorySize = Math.round(os.totalmem() / 1024 / 1024 / 1024);
      this._runtimeInfo = new RuntimeInfo(
        osPlatform,
        osHostname,
        osUsername,
        osMachineId,
        athleteMachineId,
        cpuName,
        memorySize
      );
    }
    return this._runtimeInfo;
  }

  public printRuntimeInfo(): string {
    const runtimeInfo = this.getRuntimeInfo();
    return `Hostname ${runtimeInfo.osHostname}; Platform ${runtimeInfo.osPlatform.name} ${runtimeInfo.osPlatform.arch}; Cpu ${runtimeInfo.cpu.name}; Memory ${runtimeInfo.memorySizeGb}GB; athleteMachineId ${runtimeInfo.athleteMachineId}; Node v${process.versions.node}`;
  }
}
