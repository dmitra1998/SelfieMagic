import { CameraType } from "expo-camera";


export interface CameraState {

    type: CameraType;

    isRecording:boolean;

    elapsedTime:number;

}


export interface RecordedVideo {

    uri:string;

    duration:number;

}