/* Web Worker for audio-editor.ru WAV export.
 * Protocol expected by build/bundle.js:
 * 1) { sample_rate, kbps, channels }
 * 2) left channel Int16 PCM ArrayBuffer
 * 3) right channel Int16 PCM ArrayBuffer or null
 * Final response: Blob via postMessage(blob)
 */
(function () {
  'use strict';

  var config = null;
  var left = null;

  function progress(value) {
    // build/bundle.js treats falsy percentage as the final Blob.
    postMessage({ percentage: Math.max(1, Math.min(99, value | 0)) });
  }

  function writeString(view, offset, value) {
    for (var i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  function encodeWav(leftChannel, rightChannel, sampleRate, channels) {
    var sampleCount = leftChannel.length;
    var blockAlign = channels * 2;
    var byteRate = sampleRate * blockAlign;
    var dataSize = sampleCount * blockAlign;
    var buffer = new ArrayBuffer(44 + dataSize);
    var view = new DataView(buffer);
    var offset = 0;

    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + dataSize, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4; // PCM fmt chunk size
    view.setUint16(offset, 1, true); offset += 2;  // PCM format
    view.setUint16(offset, channels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataSize, true); offset += 4;

    for (var i = 0; i < sampleCount; i += 1) {
      view.setInt16(offset, leftChannel[i], true); offset += 2;
      if (channels === 2) {
        view.setInt16(offset, rightChannel ? rightChannel[i] : leftChannel[i], true); offset += 2;
      }
      if ((i & 0xffff) === 0 && sampleCount > 0) {
        progress(1 + (i / sampleCount) * 98);
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  onmessage = function (event) {
    if (!config) {
      config = event.data || {};
      config.sample_rate = config.sample_rate || 44100;
      config.channels = config.channels === 2 ? 2 : 1;
      return;
    }

    if (!left) {
      left = new Int16Array(event.data);
      return;
    }

    var right = event.data ? new Int16Array(event.data) : null;
    var blob = encodeWav(left, right, config.sample_rate, config.channels);
    postMessage(blob);

    config = null;
    left = null;
  };
}());
