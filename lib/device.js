/*
 * Copyright (c) 2020 LG Electronics Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const util = require('util'),
    async = require('async'),
    npmlog = require('npmlog'),
    luna = require('./base/luna'),
    novacom = require('./base/novacom'),
    errHndl = require('./base/error-handler');

(function() {

    const log = npmlog;
    log.heading = 'device';
    log.level = 'warn';

    const device = {

        /**
         * @property {Object} log an npm log instance
         */
        log: log,

        /**
         * Print system information of the given device
         * @property options {String} device the device to connect to
         */
        systemInfo: function(options, next) {
            if (typeof next !== 'function') {
                throw errHndl.changeErrMsg("MISSING_CALLBACK", "next", util.inspect(next));
            }
            options = options || {};
            async.series([
                _makeSession,
                _getOsInfo,
                _getDeviceInfo,
                _getChromiumVersion,
                _getQtbaseVersion,
            ],  function(err, results) {
                log.verbose("device#systemInfo()", "err: ", err, "results:", results);
                let resultTxt = "";
                for (let i = 1; i < results.length; i++) {
                    resultTxt += results[i] + "\n";
                }
                next(err, resultTxt.trim());
            });

            function _makeSession(next) {
                options.nReplies = 1; // -n 1
                options.session = new novacom.Session(options.device, next);
            }

            function _getOsInfo(next) {
                log.info("device#systemInfo#_getOsInfo()");
                const target = options.session.getDevice(),
                    addr = target.lunaAddr.osInfo,
                    param = {
                            // luna param
                            parameters:["webos_build_id","webos_imagename","webos_name","webos_release",
                                        "webos_manufacturing_version", "core_os_kernel_version"],
                            subscribe: false
                        };

                luna.send(options, addr, param, function(lineObj, next) {
                    log.silly("device#systemInfo#_getOsInfo():", "lineObj:", lineObj);
                    const resultValue = lineObj;

                    if (resultValue.returnValue) {
                        log.verbose("device#systemInfo#_getOsInfo():", "success");
                        delete resultValue.returnValue; // remove unnecessary data
                        next(null, _makeReturnTxt(resultValue));
                    } else {
                        log.verbose("device#systemInfo#_getOsInfo():", "failure");
                        log.verbose('device#systemInfo#_getOsInfo(): luna-send command failed' +
                                    (resultValue.errorText ? ' (' + resultValue.errorText + ')' :
                                    (resultValue.errorMessage ? ' (' + resultValue.errorMessage + ')' : '')));
                    }
                }, next);
            }

            function _getDeviceInfo(next) {
                log.info("device#systemInfo#_getDeviceInfo()");
                const target = options.session.getDevice(),
                    addr = target.lunaAddr.deviceInfo,
                    param = {
                            // luna param
                            subscribe: false
                        };

                luna.send(options, addr, param, function(lineObj, next) {
                    log.silly("device#systemInfo#_getDeviceInfo():", "lineObj:", lineObj);
                    const resultValue = lineObj,
                        returnObj ={};

                    if (resultValue.returnValue) {
                        log.verbose("device#systemInfo#_getDeviceInfo():", "success");
                        returnObj.device_name = resultValue.device_name;
                        returnObj.device_id = resultValue.device_id;
                        next(null, _makeReturnTxt(returnObj));
                    } else {
                        log.verbose("device#systemInfo#_getDeviceInfo():", "failure");
                        log.verbose('device#systemInfo#_getDeviceInfo(): luna-send command failed' +
                                    (resultValue.errorText ? ' (' + resultValue.errorText + ')' :
                                    (resultValue.errorMessage ? ' (' + resultValue.errorMessage + ')' : '')));
                    }
                }, next);
            }

            function _getChromiumVersion(next) {
                log.info("device#systemInfo#_getChromiumInfo()");

                // opkg is required permission as root.
                if (options.session.getDevice().username !== 'root') {
                    return next(null, "chromium_version : " + "not supported");
                } else {
                    const cmd = '/usr/bin/opkg list-installed webruntime';
                    options.session.run(cmd, null, __data, __error, function(err) {
                        if (err) {
                            return next(err);
                        }
                    });
                }
                function __data(data) {
                    const str = (Buffer.isBuffer(data)) ? data.toString() : data,
                        exp = /\d*\.\d*\.\d*\.\d*/,
                        version = str.match(exp);

                    next(null, "chromium_version : " + version);
                }

                function __error(data) {
                    const str = (Buffer.isBuffer(data)) ? data.toString() : data;
                    return next(new Error(str));
                }
            }

            function _getQtbaseVersion(next) {
                log.info("device#systemInfo#_getQtbaseInfo()");

                // opkg is required permission as root.
                if (options.session.getDevice().username !== 'root') {
                    return next(null, "qt_version : " + "not supported");
                } else {
                    const cmd = '/usr/bin/opkg list-installed qtbase';
                    options.session.run(cmd, null, __data, __error,  function(err) {
                        if (err) {
                            return next(err);
                    }});
                }
                function __data(data) {
                    const str = (Buffer.isBuffer(data)) ? data.toString() : data,
                        exp = /\d*\.\d*\.\d*/,
                        version = str.match(exp);
                    next(null, "qt_version : " + version);
                }

                function __error(data) {
                    const str = (Buffer.isBuffer(data)) ? data.toString() : data;
                    return next(new Error(str));
                }
            }

            function _makeReturnTxt(resultValue){
                log.info("device#systemInfo#_makeReturnTxt()");
                let returnTxt = "";

                for (const key in resultValue) {
                    if (resultValue[key] === undefined) {
                        resultValue[key] = "(unknown)";
                    }
                    returnTxt += key + " : " + resultValue[key] + "\n";
                }
                return returnTxt.trim();
            }
        },
        /**
         * Print session information of the given device
         * @property options {String} device the device to connect to
         */
        sessionInfo: function(options, next) {
            if (typeof next !== 'function') {
                throw new Error('Missing completion callback (next=' + util.inspect(next) + ')');
            }
            options = options || {};
            async.series([
                _makeSession,
                _getSessionList
            ],  function(err, results) {
                log.verbose("device#sessionInfo()", "err: ", err, "results:", results);
                let resultTxt = "";

                if (results[1] !== undefined) {
                    if (typeof results[1] === "object") {
                        for (let i = 0; i < results[1].length; i++) {
                            resultTxt += _makeReturnTxt(results[1][i], 0) + "\n";
                        }
                    } else {
                        resultTxt = results[1];
                    }
                }
                next(err, resultTxt.trim());
            });

            function _makeSession(next) {
                options.nReplies = 1; // -n 1
                options.session = new novacom.Session(options.device, next);
            }

            function _getSessionList(next) {
                log.info("device#sessionInfo#_getSessionList()");
                const target = options.session.getDevice(),
                    addr = target.lunaAddr.getSessionList,
                    param = {
                        // luna param
                        subscribe: false
                    };

                luna.sendWithoutErrorHandle(options, addr, param, function(lineObj, next) {
                    log.silly("device#sessionInfo#_getSessionList():", "lineObj:", lineObj);

                    if (lineObj.returnValue) {
                        log.verbose("device#sessionInfo#_getSessionList():", "success");
                        next(null, lineObj.sessionList);
                    } else {
                        log.verbose("device#sessionInfo#_getSessionList():", "failure" + lineObj.errorText);
                        setImmediate(next, new Error("This device does not support the session."), {});
                    }
                }, next);
            }

            function _makeReturnTxt(resultValue, cnt){
                log.info("device#sessionInfo#_makeReturnTxt()");
                let returnTxt = "", prefix;
                for (const key in resultValue) {
                    prefix = "";
                    if (typeof resultValue[key] === "object") {
                        for (let i = 0; i < cnt; i++) {
                            prefix += "-";
                        }
                        returnTxt += prefix + key + "\n" + _makeReturnTxt(resultValue[key], cnt + 1);
                        continue;
                    }

                    for (let i = 0; i < cnt; i++) {
                        prefix += "-";
                    }
                    returnTxt += prefix + key + " : " + resultValue[key] + "\n";
                }
                return returnTxt;
            }
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = device;
    }
}());