import React from "react";


import {
View
} from "react-native";


import CameraPreview from "../components/camera/CameraPreview";

import CameraControls from "../components/camera/CameraControls";

import TimerIndicator from "../components/camera/TimerIndicator";


import {
useCameraRecorder
} from "../hooks/useCameraRecorder";



export default function CameraScreen(){


const {

cameraRef,

cameraType,

isRecording,

elapsedTime,

startRecording,

stopRecording,

toggleCamera


}
=
useCameraRecorder();




return (

<View
style={{
flex:1
}}
>


<CameraPreview


cameraRef={cameraRef}


cameraType={cameraType}


/>


<View
style={{
position:"absolute",
bottom:50,
width:"100%",
alignItems:"center"
}}
>


<TimerIndicator

seconds={elapsedTime}

/>


<CameraControls

recording={isRecording}

onStart={startRecording}

onStop={stopRecording}

onSwitch={toggleCamera}

/>


</View>


</View>

);

}