import * as Network from "expo-network";
import type { UploadNetworkType } from "../types/recording";

export function isInternetAvailable(state: Network.NetworkState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function getUploadNetworkType(state: Network.NetworkState): UploadNetworkType {
  if (!isInternetAvailable(state) || state.type === Network.NetworkStateType.NONE) {
    return "none";
  }

  if (state.type === Network.NetworkStateType.WIFI) {
    return "wifi";
  }

  if (state.type === Network.NetworkStateType.CELLULAR) {
    return "cellular";
  }

  return "unknown";
}
