package com.localbeats.audiometadata

import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.audiofx.Equalizer
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest
import kotlin.math.abs
import kotlin.math.roundToInt

class AudioMetadataModule : Module() {
  private var equalizer: Equalizer? = null

  private fun getEqualizer(): Equalizer {
    return equalizer ?: Equalizer(0, 0).also {
      it.enabled = true
      equalizer = it
    }
  }

  private fun findBand(effect: Equalizer, targetHz: Int): Short {
    var selected = 0
    var smallestDifference = Int.MAX_VALUE
    for (band in 0 until effect.numberOfBands) {
      val centerHz = effect.getCenterFreq(band.toShort()) / 1000
      val difference = abs(centerHz - targetHz)
      if (difference < smallestDifference) {
        selected = band
        smallestDifference = difference
      }
    }
    return selected.toShort()
  }

  override fun definition() = ModuleDefinition {
    Name("LocalBeatsAudioMetadata")

    AsyncFunction("getEqualizerInfo") {
      val effect = getEqualizer()
      mapOf(
        "supported" to true,
        "minLevel" to effect.bandLevelRange[0] / 100,
        "maxLevel" to effect.bandLevelRange[1] / 100
      )
    }

    AsyncFunction("setEqualizer") Coroutine { bassDb: Double, trebleDb: Double ->
      withContext(Dispatchers.IO) {
        val effect = getEqualizer()
        val range = effect.bandLevelRange
        val bassBand = findBand(effect, 80)
        var trebleBand = findBand(effect, 10000)
        if (effect.numberOfBands > 1 && trebleBand == bassBand) {
          trebleBand = (0 until effect.numberOfBands)
            .map { it.toShort() }
            .maxBy { effect.getCenterFreq(it) }
        }

        val bassLevel = (bassDb * 100).roundToInt().coerceIn(range[0].toInt(), range[1].toInt()).toShort()
        val trebleLevel = (trebleDb * 100).roundToInt().coerceIn(range[0].toInt(), range[1].toInt()).toShort()
        effect.setBandLevel(bassBand, bassLevel)
        effect.setBandLevel(trebleBand, trebleLevel)
        effect.enabled = true
        mapOf("bass" to bassLevel / 100, "treble" to trebleLevel / 100)
      }
    }

    AsyncFunction("getMetadata") Coroutine { uri: String ->
      withContext(Dispatchers.IO) {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        val retriever = MediaMetadataRetriever()
        try {
          val contentUri = Uri.parse(uri)
          retriever.setDataSource(context, contentUri)
          val artworkUri = try {
            retriever.embeddedPicture?.let { imageBytes ->
              val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
              BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, bounds)
              var sampleSize = 1
              while (bounds.outWidth / sampleSize > 512 || bounds.outHeight / sampleSize > 512) {
                sampleSize *= 2
              }
              val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
              val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)
                ?: return@let null
              val artworkDirectory = File(context.cacheDir, "album-art").apply { mkdirs() }
              val digest = MessageDigest.getInstance("SHA-256")
                .digest(uri.toByteArray())
                .joinToString("") { "%02x".format(it) }
              val artworkFile = File(artworkDirectory, "$digest.jpg")
              artworkFile.outputStream().use { output ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 82, output)
              }
              bitmap.recycle()
              Uri.fromFile(artworkFile).toString()
            }
          } catch (_: Exception) {
            null
          }

          val sizeBytes = try {
            context.contentResolver.query(
              contentUri,
              arrayOf(OpenableColumns.SIZE),
              null,
              null,
              null
            )?.use { cursor ->
              if (cursor.moveToFirst()) {
                val sizeColumn = cursor.getColumnIndex(OpenableColumns.SIZE)
                if (sizeColumn >= 0 && !cursor.isNull(sizeColumn)) cursor.getLong(sizeColumn) else null
              } else {
                null
              }
            }
          } catch (_: Exception) {
            null
          }

          mapOf(
            "title" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE),
            "artist" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST),
            "album" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM),
            "albumArtist" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUMARTIST),
            "genre" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE),
            "year" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR),
            "trackNumber" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_CD_TRACK_NUMBER)
              ?.substringBefore("/")
              ?.toIntOrNull(),
            "duration" to retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
              ?.toLongOrNull()
              ?.div(1000),
            "artworkUri" to artworkUri,
            "sizeBytes" to sizeBytes
          )
        } finally {
          retriever.release()
        }
      }
    }

    OnDestroy {
      equalizer?.release()
      equalizer = null
    }
  }
}
