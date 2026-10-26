import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

export default function AlbumArt({ uri, size = 54, style }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  return (
    <View style={[{
      width: size,
      height: size,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: C.panel2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.line
    }, style]}>
      {uri && !imageFailed ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          onError={() => {
            console.warn('Could not display extracted album artwork.');
            setImageFailed(true);
          }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Ionicons name="musical-notes" size={size * .43} color={C.redBright} />
      )}
    </View>
  );
}
