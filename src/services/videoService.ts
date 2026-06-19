import * as MediaLibrary from "expo-media-library";


export async function saveVideo(uri:string){


const permission =
await MediaLibrary.requestPermissionsAsync();


if(!permission.granted){

throw new Error(
"Media permission denied"
);

}


const asset =
await MediaLibrary.createAssetAsync(uri);



console.log(
"Saved to gallery:",
asset.uri
);


return asset.uri;

}