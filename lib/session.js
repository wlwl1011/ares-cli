/*
 * Copyright (c) 2020 LG Electronics Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const npmlog = require('npmlog'),
    luna = require('./base/luna'),
    errHndl = require('./base/error-handler');

(function() {
    const log = npmlog;
    log.heading = 'session';
    log.level = 'warn';

    const session ={
        log: log,
        getSessionList: function(options, next) {
            log.info("session.js#session#getSessionList()", "options.display:", options.display);
            const target = options.session.getDevice(),
                addr = target.lunaAddr.getSessionList,
                param = {
                    // luna param
                    subscribe: false
                };
            let matchedSessionId = false;

            luna.sendWithoutErrorHandle(options, addr, param, function(lineObj, next) {
                const resultValue = lineObj;

                // case of exist sessionManager(auto)
                if (resultValue.returnValue) {
                    if (!options.display) {
                        options.display = 0;
                    }

                    for (let i = 0; i < resultValue.sessionList.length; i++) {
                        if (resultValue.sessionList[i].deviceSetInfo.displayId === undefined) {
                            return next(errHndl.changeErrMsg("NOT_EXIST_DISPLAY"));
                        }
                        // compare returned displayId with input display
                        if (resultValue.sessionList[i].deviceSetInfo.displayId === Number(options.display)) {
                            // case the same, is going to call session call
                            options.sessionId = resultValue.sessionList[i].sessionId;
                            options.sessionInsptPort = resultValue.sessionList[i].deviceSetInfo.port.inspectorWam;
                            options.sessionCall = true;
                            matchedSessionId = true;
                            log.info("session.js#getSessionList()", "options.sessionId:", options.sessionId, "options.sessionCall:", options.sessionCall);
                        }
                    }

                    if (!matchedSessionId) {
                        return next(errHndl.changeErrMsg("INVALID_VALUE", "DISPLAY_ID", options.display));
                    }
                } else {
                    log.info("sendWithoutErrorHandle error : " + resultValue.errorText);
                }
                next(null, {});
            }, next);
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = session;
    }
}());