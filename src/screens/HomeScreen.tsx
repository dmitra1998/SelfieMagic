import React from "react";

import {
 View,
 Text,
 Button
} from "react-native";


import {
 logout
} from "../services/authService";


import {
 NativeStackScreenProps
} from "@react-navigation/native-stack";


import {
 RootStackParamList
} from "../types/navigation";


type Props =
NativeStackScreenProps<
 RootStackParamList,
 "Home"
>;


export default function HomeScreen(
 {navigation}:Props
){


async function handleLogout(){

    await logout();

    navigation.navigate("Login");

}


return (

<View
 style={{
   flex:1,
   justifyContent:"center",
   alignItems:"center"
 }}
>

<Text>
 Welcome Home
</Text>


<Button

 title="Logout"

 onPress={handleLogout}

/>


</View>

);

}