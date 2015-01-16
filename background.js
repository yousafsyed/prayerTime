!(function() {
    "use strict";
    var pt = new PrayerTime();
    var cordinates = [28.4636296, -16.2518467];
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
       times=     {
    asr: "20:06",
    dhuhr: "20:04",
    fajr: "20:2",
    imsak: "20:21",
    isha: "20:10",
    maghrib: "20:08",
    midnight: "20:21",
    sunrise: "20:21",
    sunset: "20:21"
}
            for (var key in times) {
                var obj = times[key];
                console.log('key',key);
                console.log('obj',obj);
                if (key != "asr" || key != "dhur" || key != "fajr" || key != "isha" || key != "maghrib") return false;
                updateTime(times);
                if (time24Hrs(new Date()) == obj) {
                    playAlarm(key,obj);
                }
            }
            checkTimes();
        }, 60000)
    }
    checkTimes();
})()
