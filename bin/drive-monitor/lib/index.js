// --------------------
// drive-monitor module
// --------------------
// watch for drive on config.driveLocation
// mount drive to config.mountPoint
// 
// modules
var fs = require('fs-extra-promise');

// exports
var DriveMonitor = module.exports = function(eventHandler) {
    this.eventHandler = eventHandler;
    return this;
};

DriveMonitor.prototype.start = function() {
    var self = this,
        drives = this.drives;

    // start watching
    var newEvents = false,
        started = false;

    this.watcher = fs.watch('/dev', function(event, name) { // jshint ignore:line
        if (!started) {
            newEvents = true;
            return;
        }

        if (drives.indexOf(name) != -1) {
            // drive ejected
            drives.splice(drives.indexOf(name), 1);
            if (self.eventHandler) self.eventHandler('eject', name);
            return;
        }

        // drive mounted
        drives.push(name);
        if (self.eventHandler) self.eventHandler('mount', name);
    });

    // get drives currently connected
    return getDrives();

    function getDrives() {
        return fs.readdirAsync('/Volumes')
        .then(function(files) {
            if (newEvents) {
                newEvents = false;
                return getDrives();
            }

            started = true;

            drives = self.drives = [];
            files.forEach(function(name) {
                if (name == '.DS_Store') return;
                drives.push(name);
            });

            return drives;
        });
    }
};

DriveMonitor.prototype.stop = function() {
    this.watcher.close();
    delete this.watcher;
};
