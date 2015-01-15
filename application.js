!(function() {
    "use strict";
    var pt = new PrayerTime();
    var cordinates = [28.632244, 77.220724];
    var audio = new Audio();
    audio.src = "audio/alarm.mp3";

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
                // if (obj != "asr" || obj != "dhur" || obj != "fajr" || obj != "isha" || obj != "maghrib") return false;
                updateTime(times);
                if (time24Hrs(new Date()) == obj) {
                    playAlarm();
                }
            }
            checkTimes();
        }, 100000)
    }
    checkTimes();
})()