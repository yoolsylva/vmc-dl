import slugify from 'slugify';
import util from 'util';
import RNFS from 'react-native-fs';
import { LogLevel, RNFFmpeg } from 'react-native-ffmpeg';
import ytdl from 'lib/ytdl';
import { addToast } from '_actions/toasts';
import * as downloadDirs from '_constants/downloadDirs';
import * as constants from '_constants/songs';
import Share from 'react-native-share';

// const getInfo = util.promisify(ytdl.getInfo);

function addSongStart() {
    return {
        type: constants.ADD_SONG_START,
    }
}

function addSongSuccess(song) {
    return {
        type: constants.ADD_SONG_SUCCESS,
        song,
    }
}

function addSongFailure() {
    return {
        type: constants.ADD_SONG_FAILURE,
    }
}

function deleteSongStart() {
    return {
        type: constants.DELETE_SONG_START,
    }
}

function deleteSongSuccess(id) {
    return {
        type: constants.DELETE_SONG_SUCCESS,
        id,
    }
}

function deleteSongFailure() {
    return {
        type: constants.DELETE_SONG_FAILURE,
    }
}

export function addSong(url) {
    return async function (dispatch, getState) {
        dispatch(addSongStart());
        try {
            const id = ytdl.getVideoID(url);
            const info = await ytdl.getInfo(id);
            console.log(info)
            const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
            console.log(format)
            const origin_path = `${RNFS.ExternalDirectoryPath}/${info.videoDetails.videoId}.${format.container}`
            const path = `${RNFS.ExternalDirectoryPath}/${info.videoDetails.videoId}.AAC`;
            const thumbnailPath = `${RNFS.ExternalDirectoryPath}/${info.videoDetails.videoId}.jpg`;
            // await Promise.all([
            //     RNFS.mkdir(downloadDirs.songs),
            //     RNFS.mkdir(downloadDirs.thumbnails),
            // ]);
            await RNFS.downloadFile({
                fromUrl: format.url,
                toFile: origin_path,
            }).promise

            await Promise.all([
                RNFFmpeg.executeWithArguments([
                    '-i',
                    origin_path,
                    // '-vn',
                    '-ab', '96k',
                    '-c:a', 'copy',
                    path,
                ]),
                RNFS.downloadFile({
                    fromUrl: info.videoDetails.thumbnail.thumbnails && info.videoDetails.thumbnail.thumbnails.length ? info.videoDetails.thumbnail.thumbnails.splice(-1)[0].url : `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
                    toFile: thumbnailPath,
                }).promise,
            ]);
            dispatch(addSongSuccess({
                id: info.videoDetails.videoId,
                name: info.title,
                path: origin_path,
                thumbnailPath,
            }));
            dispatch(addToast(`Successfully downloaded ${info.title}`));
        } catch (err) {
            console.log("download convert error:", err)
            dispatch(addSongFailure());
            dispatch(addToast(`Error downloading from ${url}`));
        }
    }
}

export function deleteSong(song) {
    return async function (dispatch) {
        dispatch(deleteSongStart());
        try {
            await Promise.all([
                RNFS.unlink(song.path),
                RNFS.unlink(song.thumbnailPath),
            ]);
            dispatch(deleteSongSuccess(song.id));
            dispatch(addToast(`Successfully deleted ${song.name}`));
        } catch (err) {
            console.log(err)
            dispatch(deleteSongFailure());
            dispatch(addToast(`Error deleting ${song.name}`));
        }
    }
}

export function shareSong(song) {
    const options = {
        url: `file://${song.path}`
    }
    Share.open(options)
    .then((res) => { console.log(res) })
    .catch((err) => { err && console.log(err); });
}
