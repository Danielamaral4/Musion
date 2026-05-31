import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Image,
  InteractionManager,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { buildReviewShareMessage, normalizeReviewForShare } from '../services/shareReview';

const DEFAULT_COVER = 'https://i.stack.imgur.com/l60Hf.png';

const getRatingColor = (rating) => {
  const n = parseFloat(rating);

  if (Number.isNaN(n)) return '#55565C';
  if (n <= 3.9) return '#F20505';
  if (n <= 6.0) return '#F2CB05';

  return '#37A603';
};

export function ReviewShareCard({ review }) {
  const data = normalizeReviewForShare(review);
  const authorSignature = data.authorUsername
    ? `${data.authorName} • ${data.authorUsername}`
    : data.authorName;

  return (
    <View style={styles.storyCanvas} collapsable={false}>
      <LinearGradient
        colors={['rgba(222, 224, 232, 0.2)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['transparent', 'rgba(222, 224, 232, 0.16)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', '#18191D']}
          start={{ x: 0.5, y: 0.08 }}
          end={{ x: 0.5, y: 0.92 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.brandRow}>
        <Image
          source={require('../../assets/musionlogo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandLabel}>Review</Text>
      </View>

      <View style={styles.shareCardShadow}>
        <View style={styles.shareCard}>
          <Image
            source={{ uri: data.albumCover || DEFAULT_COVER }}
            style={styles.albumCover}
          />

          <View style={styles.infoBlock}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.albumName} numberOfLines={3}>
                  {data.albumName}
                </Text>
                {data.artistName ? (
                  <Text style={styles.artistName} numberOfLines={2}>
                    {data.artistName}
                  </Text>
                ) : null}
              </View>

              <View
                style={[
                  styles.ratingBadge,
                  { backgroundColor: getRatingColor(data.rating) },
                ]}
              >
                <Text style={styles.ratingText}>{data.ratingLabel}</Text>
              </View>
            </View>

            {data.text ? (
              <Text style={styles.reviewText} numberOfLines={5}>
                {data.text}
              </Text>
            ) : null}

            <View style={styles.authorRow}>
              <Text style={styles.authorText} numberOfLines={1}>
                {authorSignature}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function useReviewShare() {
  const viewShotRef = useRef(null);
  const [pendingReview, setPendingReview] = useState(null);
  const [sharing, setSharing] = useState(false);

  const shareReviewCard = useCallback(
    async (review) => {
      if (sharing) return;

      const data = normalizeReviewForShare(review);
      setSharing(true);

      if (data.albumCover) {
        try {
          await Image.prefetch(data.albumCover);
        } catch (error) {}
      }

      setPendingReview(data);

      InteractionManager.runAfterInteractions(() => {
        setTimeout(async () => {
          try {
            const uri = await viewShotRef.current?.capture?.();

            if (!uri) {
              await Share.share({ message: buildReviewShareMessage(data) });
              return;
            }

            const isAvailable = await Sharing.isAvailableAsync();

            if (isAvailable) {
              await Sharing.shareAsync(uri, {
                dialogTitle: 'Compartilhar review do Musion',
                mimeType: 'image/png',
                UTI: 'public.png',
              });
            } else {
              await Share.share({ message: buildReviewShareMessage(data) });
            }
          } catch (error) {
            Alert.alert(
              'Compartilhar',
              'Nao foi possivel gerar a imagem da review agora.'
            );
          } finally {
            setPendingReview(null);
            setSharing(false);
          }
        }, 520);
      });
    },
    [sharing]
  );

  const ShareReviewHost = useCallback(() => {
    if (!pendingReview) return null;

    return (
      <View pointerEvents="none" style={styles.hiddenCaptureWrapper}>
        <ViewShot
          ref={viewShotRef}
          options={{
            fileName: `musion-review-${pendingReview.reviewId || Date.now()}`,
            format: 'png',
            quality: 1,
          }}
        >
          <ReviewShareCard review={pendingReview} />
        </ViewShot>
      </View>
    );
  }, [pendingReview]);

  return {
    shareReviewCard,
    ShareReviewHost,
    sharingReview: sharing,
  };
}

const styles = StyleSheet.create({
  hiddenCaptureWrapper: {
    position: 'absolute',
    left: -1200,
    top: 0,
    width: 360,
    height: 640,
    zIndex: 999,
  },
  storyCanvas: {
    width: 360,
    height: 640,
    backgroundColor: '#18191D',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 48 : 40,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  logo: {
    width: 112,
    height: 34,
  },
  brandLabel: {
    color: 'rgba(222, 224, 232, 0.62)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  shareCardShadow: {
    width: 270,
    alignSelf: 'center',
    position: 'relative',
  },
  shareCard: {
    width: 270,
    backgroundColor: '#18191D',
    borderWidth: 1.5,
    borderColor: '#DEE0E8',
    borderRadius: 8,
    padding: 14,
  },
  albumCover: {
    width: 230,
    height: 230,
    borderRadius: 8,
    backgroundColor: '#282A30',
    alignSelf: 'center',
    marginBottom: 18,
  },
  infoBlock: {
    width: 230,
    alignSelf: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  albumName: {
    color: '#DEE0E8',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
  },
  artistName: {
    color: 'rgba(222, 224, 232, 0.64)',
    fontSize: 15,
    lineHeight: 19,
    marginTop: 5,
    fontWeight: '600',
  },
  ratingBadge: {
    width: 46,
    height: 46,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
  },
  reviewText: {
    color: '#DEE0E8',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    marginTop: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  authorText: {
    color: 'rgba(222, 224, 232, 0.24)',
    fontSize: 12,
    fontWeight: '700',
  },
});
