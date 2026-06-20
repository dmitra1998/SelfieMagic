import React from "react";


import {
Text,
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

gpsStatus,

readyGps,

recordingStartGps,

batteryLevel,

batteryLevelAtStart,

batteryLevelAtEnd,

startRecording,

stopRecording,

toggleCamera


}
=
useCameraRecorder();

const displayedGps =
isRecording
?
recordingStartGps
??
readyGps
:
readyGps;

const gpsText =
displayedGps
?
`GPS: ${displayedGps.latitude.toFixed(6)}, ${displayedGps.longitude.toFixed(6)}`
:
gpsStatus === "denied"
?
"GPS permission denied"
:
gpsStatus === "error"
?
"GPS unavailable"
:
"Getting GPS...";

function formatBatteryLevel(level:number | null){
if(level === null || level < 0){
return "Unavailable";
}

return `${Math.round(level * 100)}%`;
}

const batteryText =
isRecording
?
`Battery start: ${formatBatteryLevel(batteryLevelAtStart ?? batteryLevel)}`
:
batteryLevelAtEnd !== null
?
`Battery start: ${formatBatteryLevel(batteryLevelAtStart)} | end: ${formatBatteryLevel(batteryLevelAtEnd)}`
:
`Battery: ${formatBatteryLevel(batteryLevel)}`;




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
top:60,
left:20,
right:20,
alignItems:"center"
}}
>


<Text
style={{
fontSize:16,
color:"white",
backgroundColor:"rgba(0,0,0,0.55)",
paddingHorizontal:12,
paddingVertical:8,
borderRadius:6,
textAlign:"center"
}}
>

{gpsText}

</Text>

<Text
style={{
fontSize:16,
color:"white",
backgroundColor:"rgba(0,0,0,0.55)",
paddingHorizontal:12,
paddingVertical:8,
borderRadius:6,
textAlign:"center",
marginTop:8
}}
>

{batteryText}

</Text>


</View>


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

canRecord={gpsStatus === "ready" && Boolean(readyGps)}

onStart={startRecording}

onStop={stopRecording}

onSwitch={toggleCamera}

/>


</View>


</View>

);

}
