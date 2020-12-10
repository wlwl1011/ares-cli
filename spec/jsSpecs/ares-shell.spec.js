/*
 * Copyright (c) 2020 LG Electronics Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const exec = require('child_process').exec,
    common = require('./common-spec');

const aresCmd = 'ares-shell';

let cmd,
    options;

beforeAll(function (done) {
    cmd = common.makeCmd(aresCmd);
    common.getOptions()
    .then(function(result){
        options = result;
        done();
    });
});

describe(aresCmd, function() {
    it("Add device with ares-setup-device", function(done) {
        common.resetDeviceList()
        .then(function(){
            return common.addDeviceInfo();
        }).then(function(result) {
            expect(result).toContain(options.device);
            done();
        }).catch(function(err) {
            expect(err).toContain("The specified value already exist");
            done();
        });
    });
});

describe(aresCmd + ' -h -v', function() {
    it('Print help message with verbose log', function(done) {
        exec(cmd + ' -h -v', function (error, stdout, stderr) {
            expect(stderr.toString()).toContain("verb argv");
            expect(stdout).toContain("SYNOPSIS");
            expect(error).toBeNull();
            done();
        });
    });
});

describe(aresCmd + ' --device-list(-D)', function() {
    it('Show available device list', function(done) {
        exec(cmd + ' -D', function (error, stdout) {
            expect(stdout).toContain(options.device);
            done();
        });
    });
});

describe(aresCmd, function() {
    it('Open shell on default device', function(done) {
        exec(cmd, function (error, stdout) {
            expect(stdout).toContain(`Start ${options.device} shell`, error);
            done();
        });
    });
});

describe(aresCmd + ' --display(-dp)', function() {
    it('Set display', function(done) {
        exec(cmd + ' -dp 1', function (error, stdout, stderr) {
            if (options.device === "emulator") { // emulator's default setting user is "developer"
                expect(stderr).toContain("Unable to connect to the target device. root access required <connect user session>", error);
            }
            else {
                expect(stdout).toContain(`Start ${options.device} shell`, error);
            }
            done();
        });
    });
});

describe(aresCmd + ' --run', function() {
    it('Run CMD', function(done) {
        // eslint-disable-next-line no-useless-escape
        exec(cmd + ' -dp 1 -r \"echo hello webOS\"', function (error, stdout, stderr) {
            if (options.device === "emulator") { // emulator's default setting user is "developer"
                expect(stderr).toContain("Unable to connect to the target device. root access required <connect user session>", error);
            } else {
                expect(stdout.trim()).toBe("hello webOS", stderr);
            }
            done();
        });
    });
});