!(function() {
    "use strict";
    var pt = new PrayerTime();
    var cordinates;
    chrome.storage.sync.get({
        city: '',
        lat: '',
        lng: ''
    }, function(info) {
        cordinates = [info.lat, info.lng];
    });
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        var changedCity = false;
        var info = {};
        for (key in changes) {
            var storageChange = changes[key];
            if (key == 'city' || key == 'lat' || key || 'lng') {
                changedCity = true;
                info[key] = storageChange.newValue;
            }
        }
        if (Object.keys(info).length === 3) {
            cordinates = [info.lat, info.lng];
        }
    });
    var audio = new Audio();
    audio.src = "audio/alarm.mp3";
    var played = {};
    played.date = new Date();
    played.times = {
        asr: false,
        dhuhr: false,
        fajr: false,
        imsak: false,
        isha: false,
        maghrib: false,
        midnight: false,
        sunrise: false,
        sunset: false
    }

    function time12Hrs(dt) {
        var formatted = '';
        if (dt) {
            var hours24 = dt.getHours();
            var hours = ((hours24 + 11) % 12) + 1;
            formatted = [formatted, [hours, dt.getMinutes()].join(":")].join("");
        }
        return formatted.trim();
    };

    function time24Hrs(dt) {
        var formatted = '';
        if (dt) {
            var hours24 = dt.getHours();
            var minutes = dt.getMinutes();
            formatted = [dt.getHours(), dt.getMinutes()].join(":");
        }
        return formatted.split(":")[0].length == 1 ? ("0" + formatted.trim()) : formatted.trim();
    };

    function updateTime(times) {
        console.log("Update time called")
    };

    function playAlarm() {
        if (Notification.permission !== "granted") {
            Notification.requestPermission(function(p) {
                if (p == "granted") playAlarm();
            });
        }
        if (Notification.permission === "granted") {
            var notification = new Notification("Its Your Prayer Time");
            notification.onshow = function() {
                audio.play();
            };
        }
    };

    function getTimeZone() {
        var z = new Date();
        z = z.toString().split(" ")[5].split(/[a-zA-Z]/);
        z = z[z.length - 1].split("+")[1];
        return z.slice(0, 2) + "." + z.slice(2);
    };

    function checkTimes() {
        setTimeout(function() {
            var times = pt.getTimes(new Date(), cordinates, getTimeZone());
            for (var key in times) {
                var obj = times[key];
                //if (key != "asr" || key != "dhur" || key != "fajr" || key != "isha" || key != "maghrib") return false;
                var playedDate = played.date.setHours(0, 0, 0, 0);
                var todaysDate = new Date().setHours(0, 0, 0, 0);
                if (todaysDate == playedDate) {
                    if (played.times[key] == true) {
                        continue;
                    }
                } else {
                    played.date = new Date();
                    played.times[key] = false;
                }
                if (time24Hrs(new Date()) == obj) {
                    played.times[key] = true;
                    playAlarm(key, obj);
                }
            }
            checkTimes();
        }, 1000)
    }
    checkTimes();
})()