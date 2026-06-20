import React from "react";

import {
View,
Button
} from "react-native";


import RecordButton from "./RecordButton";


export default function CameraControls({

recording,

canRecord,

onStart,

onStop,

onSwitch


}:any){


return (

<View>


<RecordButton

recording={recording}

disabled={!recording && !canRecord}

onPress={
recording
?
onStop
:
onStart
}

/>


<Button

title="Flip Camera"

onPress={onSwitch}

/>


</View>

);

}
