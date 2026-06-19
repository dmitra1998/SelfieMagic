import React from "react";

import {
Text
} from "react-native";


export default function TimerIndicator({

seconds

}:{
seconds:number
}){


const mins =
Math.floor(seconds/60)
.toString()
.padStart(2,"0");


const secs =
(seconds%60)
.toString()
.padStart(2,"0");



return (

<Text
style={{
fontSize:22,
color:"white"
}}
>

{mins}:{secs}

</Text>

);


}