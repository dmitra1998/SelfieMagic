import React from "react";


import {
CameraView
} from "expo-camera";


export default function CameraPreview({

cameraRef,

cameraType

}:any){


return (

<CameraView

ref={cameraRef}

facing={cameraType}

mode="video"

style={{
flex:1
}}

/>

);


}