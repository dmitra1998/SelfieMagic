import AsyncStorage from "@react-native-async-storage/async-storage";


const MOCK_USER = {
  email: "test@gmail.com",
  password: "123456"
};


export async function login(
  email:string,
  password:string
){

  if(
    email === MOCK_USER.email &&
    password === MOCK_USER.password
  ){

    // fake token
    const token = "mock-jwt-token-12345";


    await AsyncStorage.setItem(
      "authToken",
      token
    );


    return {
      success:true,
      token
    };

  }


  return {
    success:false,
    token:null
  };

}



export async function logout(){

  await AsyncStorage.removeItem(
    "authToken"
  );

}



export async function isAuthenticated(){

 const token =
   await AsyncStorage.getItem(
     "authToken"
   );


 return token !== null;

}