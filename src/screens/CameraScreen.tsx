import React, {
 useState,
 useRef
} from "react";


import {
 View,
 Button,
 StyleSheet
} from "react-native";


import {
 CameraView,
 useCameraPermissions
} from "expo-camera";



export default function CameraScreen(){


const [permission,requestPermission] =
useCameraPermissions();


const cameraRef = useRef<CameraView>(null);



if(!permission){
    return null;
}


if(!permission.granted){

return (

<View>

<Button

title="Allow Camera"

onPress={requestPermission}

/>

</View>

);

}



async function startRecording(){


if(cameraRef.current){

 const video =
 await cameraRef.current.recordAsync();


 console.log(
   "Video saved:",
   video?.uri
 );

}

}



function stopRecording(){

 cameraRef.current?.stopRecording();

}



return (

<View style={styles.container}>


<CameraView

ref={cameraRef}

style={styles.camera}

/>


<Button

title="Start Recording"

onPress={startRecording}

/>


<Button

title="Stop Recording"

onPress={stopRecording}

/>


</View>

);

}


const styles =
StyleSheet.create({

container:{
 flex:1
},

camera:{
 flex:1
}

});