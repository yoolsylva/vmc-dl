const getInfo = require('./info');
const util = require('./util');
const sig = require('./sig');


/**
 * @param {string} link
 * @param {!Object} options
 * @returns {Promise<Array.<Object>>}
 */
const ytdl = (link, options) => {
  return ytdl.getInfo(link, options).then(info => {
    return getURLsFromInfoCallback(info, options);
  });
};
module.exports = ytdl;

ytdl.getBasicInfo = getInfo.getBasicInfo;
ytdl.getInfo = getInfo.getInfo;
ytdl.chooseFormat = util.chooseFormat;
ytdl.filterFormats = util.filterFormats;
ytdl.validateID = util.validateID;
ytdl.validateURL = util.validateURL;
ytdl.getURLVideoID = util.getURLVideoID;
ytdl.getVideoID = util.getVideoID;
ytdl.cache = {
  sig: sig.cache,
  info: getInfo.cache,
};


/**
 * Gets downloadable URLs
 *
 * @param {Object} info
 * @param {Object} options
 * @returns {Promise<Array.<Object>>}
 */
const getURLsFromInfoCallback = (info, options) => new Promise(async (resolve, reject) => {
  options = options || {};

  let err = util.playError(info, 'UNPLAYABLE');
  if (err) {
    reject(err);
    return;
  }

  if (!info.formats.length) {
    reject(Error('This video is unavailable'));
    return;
  }

  let format;
  try {
    format = util.chooseFormat(info.formats, options);
  } catch (e) {
    reject(e);
    return;
  }

  const ret = [];
  if (format.isHLS || format.isDashMPD) {
    const streams = await fetch(format.url).then(body => body.text())

    if (format.isDashMPD == 'dash-mpd') {
      console.error("[react-native-ytdl]", `Encountered stream of type: 'dash-mpd'. Please open an issue on the GitHub page and provide the videoId`)
    } else {
      // is m3u8
      const urls = streams.split(/\r?\n/).filter(line => line && !/^#/.test(line))
      urls.forEach(url => ret.push({
        url,
        headers: []
      }))
    }

  } else {
    if (options.begin) {
      format.url += `&begin=${util.humanStr(options.begin)}`;
    }

    const currentStream = {
      url: format.url,
      headers: []
    }
    if (options.range && (options.range.start || options.range.end)) {
      currentStream.headers.push({
        'Range': `bytes=${options.range.start || '0'}-${options.range.end || ''}`
      })
    }

    ret.push(currentStream);
  }

  resolve(ret)

});


export default ytdl;
