import {
Button
} from "react-native";


export default function RecordButton({

recording,

onPress

}:any){


return (

<Button

title={
recording
?
"Stop"
:
"Record"
}

onPress={onPress}

/>

);

}