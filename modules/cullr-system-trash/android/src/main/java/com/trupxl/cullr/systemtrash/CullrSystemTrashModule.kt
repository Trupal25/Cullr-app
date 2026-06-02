package com.trupxl.cullr.systemtrash

import android.app.Activity
import android.content.ContentResolver
import android.content.ContentUris
import android.os.Bundle
import android.os.Build
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val TRASH_REQUEST_CODE = 7471
private const val DELETE_REQUEST_CODE = 7472
private const val RESTORE_REQUEST_CODE = 7473

class CullrSystemTrashModule : Module() {
  private var pendingTrashRequest: Promise? = null
  private var pendingDeleteRequest: Promise? = null
  private var pendingRestoreRequest: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("CullrSystemTrash")

    AsyncFunction("moveToTrashAsync") { assetIds: List<String>, promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        promise.reject("ERR_TRASH_UNAVAILABLE", "System Trash requires Android 11 or later.", null)
        return@AsyncFunction
      }

      if (pendingTrashRequest != null) {
        promise.reject("ERR_TRASH_PENDING", "A system Trash request is already active.", null)
        return@AsyncFunction
      }

      val uris = assetIds.map { assetId ->
        val numericId = assetId.toLongOrNull()
        if (numericId == null) {
          promise.reject("ERR_INVALID_ASSET_ID", "Invalid Android media asset identifier.", null)
          return@AsyncFunction
        }
        ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, numericId)
      }

      try {
        val activity = appContext.throwingActivity
        val request = MediaStore.createTrashRequest(activity.contentResolver, uris, true)
        pendingTrashRequest = promise
        activity.startIntentSenderForResult(
          request.intentSender,
          TRASH_REQUEST_CODE,
          null,
          0,
          0,
          0
        )
      } catch (error: Exception) {
        pendingTrashRequest = null
        promise.reject("ERR_TRASH_REQUEST_FAILED", "Could not open the system Trash confirmation.", error)
      }
    }

    AsyncFunction("listTrashedImagesAsync") { limit: Int ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        emptyList<Map<String, Any?>>()
      } else {
        val resolver = appContext.reactContext?.contentResolver
          ?: throw IllegalStateException("Content resolver is unavailable.")
        queryTrashedImages(resolver, limit.coerceIn(1, 250))
      }
    }

    AsyncFunction("deletePermanentlyAsync") { assetIds: List<String>, promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        promise.reject("ERR_DELETE_UNAVAILABLE", "Permanent delete requires Android 11 or later.", null)
        return@AsyncFunction
      }

      if (pendingDeleteRequest != null) {
        promise.reject("ERR_DELETE_PENDING", "A permanent delete request is already active.", null)
        return@AsyncFunction
      }

      val uris = assetIds.map { assetId ->
        val numericId = assetId.toLongOrNull()
        if (numericId == null) {
          promise.reject("ERR_INVALID_ASSET_ID", "Invalid Android media asset identifier.", null)
          return@AsyncFunction
        }
        ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, numericId)
      }

      try {
        val activity = appContext.throwingActivity
        val request = MediaStore.createDeleteRequest(activity.contentResolver, uris)
        pendingDeleteRequest = promise
        activity.startIntentSenderForResult(
          request.intentSender,
          DELETE_REQUEST_CODE,
          null,
          0,
          0,
          0
        )
      } catch (error: Exception) {
        pendingDeleteRequest = null
        promise.reject("ERR_DELETE_REQUEST_FAILED", "Could not open the permanent delete confirmation.", error)
      }
    }

    AsyncFunction("restoreFromTrashAsync") { assetIds: List<String>, promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        promise.reject("ERR_RESTORE_UNAVAILABLE", "Restore from Trash requires Android 11 or later.", null)
        return@AsyncFunction
      }

      if (pendingRestoreRequest != null) {
        promise.reject("ERR_RESTORE_PENDING", "A restore request is already active.", null)
        return@AsyncFunction
      }

      val uris = assetIds.map { assetId ->
        val numericId = assetId.toLongOrNull()
        if (numericId == null) {
          promise.reject("ERR_INVALID_ASSET_ID", "Invalid Android media asset identifier.", null)
          return@AsyncFunction
        }
        ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, numericId)
      }

      try {
        val activity = appContext.throwingActivity
        val request = MediaStore.createTrashRequest(activity.contentResolver, uris, false)
        pendingRestoreRequest = promise
        activity.startIntentSenderForResult(
          request.intentSender,
          RESTORE_REQUEST_CODE,
          null,
          0,
          0,
          0
        )
      } catch (error: Exception) {
        pendingRestoreRequest = null
        promise.reject("ERR_RESTORE_REQUEST_FAILED", "Could not open the system restore confirmation.", error)
      }
    }

    OnActivityResult { _, (requestCode, resultCode, _) ->
      if (requestCode == TRASH_REQUEST_CODE) {
        pendingTrashRequest?.resolve(resultCode == Activity.RESULT_OK)
        pendingTrashRequest = null
      }

      if (requestCode == DELETE_REQUEST_CODE) {
        pendingDeleteRequest?.resolve(resultCode == Activity.RESULT_OK)
        pendingDeleteRequest = null
      }

      if (requestCode == RESTORE_REQUEST_CODE) {
        pendingRestoreRequest?.resolve(resultCode == Activity.RESULT_OK)
        pendingRestoreRequest = null
      }
    }
  }

  private fun queryTrashedImages(
    resolver: ContentResolver,
    limit: Int
  ): List<Map<String, Any?>> {
    val collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DISPLAY_NAME,
      MediaStore.Images.Media.WIDTH,
      MediaStore.Images.Media.HEIGHT,
      MediaStore.Images.Media.SIZE,
      MediaStore.Images.Media.DATE_ADDED
    )
    val queryArgs = Bundle().apply {
      putInt(MediaStore.QUERY_ARG_MATCH_TRASHED, MediaStore.MATCH_ONLY)
      putStringArray(
        ContentResolver.QUERY_ARG_SORT_COLUMNS,
        arrayOf(MediaStore.Images.Media.DATE_ADDED)
      )
      putInt(ContentResolver.QUERY_ARG_SORT_DIRECTION, ContentResolver.QUERY_SORT_DIRECTION_DESCENDING)
      putInt(ContentResolver.QUERY_ARG_LIMIT, limit)
    }

    val results = mutableListOf<Map<String, Any?>>()
    resolver.query(collection, projection, queryArgs, null)?.use { cursor ->
      val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
      val nameColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
      val widthColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.WIDTH)
      val heightColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.HEIGHT)
      val sizeColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.SIZE)
      val dateAddedColumn = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)

      while (cursor.moveToNext()) {
        val id = cursor.getLong(idColumn)
        val uri = ContentUris.withAppendedId(collection, id)
        results.add(
          mapOf(
            "id" to id.toString(),
            "filename" to cursor.getString(nameColumn),
            "uri" to uri.toString(),
            "width" to cursor.getInt(widthColumn),
            "height" to cursor.getInt(heightColumn),
            "fileSize" to cursor.getLong(sizeColumn).toDouble(),
            "creationTime" to cursor.getLong(dateAddedColumn).toDouble() * 1000
          )
        )
      }
    }

    return results
  }
}
