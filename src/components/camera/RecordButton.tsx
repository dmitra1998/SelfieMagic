import {
Button
} from "react-native";


export default function RecordButton({

recording,

onPress,

disabled

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

disabled={disabled}

/>

);

}
