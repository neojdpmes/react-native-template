import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useEffect, useState } from 'react';
import useSocket from './hooks/useSocket';

export default function App() {
  const [mediaPermission, requestPermission] = MediaLibrary.usePermissions();
  const [allowCheckFiles, setAllowCheckFiles] = useState(false);
  const [fileQueue, setFileQueue] = useState([] as any);
  const [files, setFiles] = useState([] as any);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (allowCheckFiles) checkfiles();
  }, [allowCheckFiles])

  useEffect(() => {
    requestPermission();
  }, []);

  useEffect(() => {
    if (mediaPermission?.status === 'denied') {
      Alert.alert('Permission required', 'Media permission required to check all files', [
        { text: 'OK' },
      ]);
    }
    if (mediaPermission?.granted) setAllowCheckFiles(true);
  }, [mediaPermission]);

  useEffect(() => {
    if (isConnected) {
      socket.on(`file-saved`, (data) => {
        console.log(fileQueue.length);
        console.log('File saved', data);
        fileQueue.pop();
        setFileQueue([...fileQueue]);
      });
    }
    return () => {
      socket.off('file-saved');
    }
  }, [isConnected, socket, fileQueue ])

  useEffect(() => {
    if (fileQueue.length > 0) {
      const { image, album } = fileQueue[fileQueue.length - 1];
      uploadFile(image, album);
    }
  }, [isConnected, fileQueue]);

  async function checkfiles() {
    /*
    const albums = await MediaLibrary.getAlbumsAsync();
    const files: any[] = [];
    for (const album of albums) files.push.apply(files, await getAlbumFiles(album));
    uploadFiles(files);
    */
    const files = await getAllFiles();
    uploadFiles(files);
  }
  

  const createAlbumFiles = (albumFiles: any[]) => {
    const files: any = {};
    for (const file of albumFiles) {
      files[file.image.id] = file;
      files[file.image.id].status = 'pending';
    }
    setFiles(files);
  }

  const uploadFiles = (albumFiles: any[]) => {
    setFileQueue(albumFiles);
    createAlbumFiles(albumFiles);
  }

  const uploadFile = async (image: MediaLibrary.Asset, album: MediaLibrary.Album) => {
    try {
      const tempUri = FileSystem.cacheDirectory + 'temp_img';
      await FileSystem.copyAsync({from: image.uri , to: tempUri});
      const file = await FileSystem.readAsStringAsync(tempUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      socket.emit('upload', { id: image.id, data: file, name: image.filename, album: album.title });
      console.log('Emitted', image.filename);
    } catch (err: any) {
      console.log(err.message);
      fileQueue.pop();
      setFileQueue([...fileQueue]);
    }
  }

  async function getAlbumFiles(album: MediaLibrary.Album) {
    console.log(album.title, album.assetCount);
    const files: any[] = [];
    let hasNext = true;
    let after;
    while (hasNext) {
      const images: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({ album: album.id, after });
      hasNext = images.hasNextPage;
      for (const image of images.assets) files.push({ image, album }); 
      after = images.endCursor;
    }
    return files;
  }

  async function getAllFiles() {
    const files: any[] = [];
    let hasNext = true;
    let after;
    while (hasNext) {
      const images: MediaLibrary.PagedInfo<MediaLibrary.Asset> = await MediaLibrary.getAssetsAsync({ after, mediaType: ['video'] });
      hasNext = images.hasNextPage;
      for (const image of images.assets) files.push({ image, album: { title: 'all'} }); 
      after = images.endCursor;
    }
    return files;
  }

  return (
    <View style={styles.container}>
      <Text>Uploading files: {fileQueue.length} left</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
