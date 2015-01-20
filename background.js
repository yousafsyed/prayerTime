!(function() {
    "use strict";
    var pt = new PrayerTime();
    var cordinates;
    var timezone;
    chrome.storage.sync.get({
        city: '',
        lat: '',
        lng: '',
        timezone: ''
    }, function(info) {
        cordinates = [info.lat, info.lng];
        timezone = info.timezone;
    });
    chrome.storage.onChanged.addListener(function(changes, namespace) {
        var changedCity = false;
        var info = {};
        for (var key in changes) {
            var storageChange = changes[key];
            if (key == 'city' || key == 'lat' || key == 'lng' || key == 'timezone') {
                changedCity = true;
                info[key] = storageChange.newValue;
            }
        }
        if (Object.keys(info).length === 4) {
            cordinates = [info.lat, info.lng];
            timezone = info.timezone;
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
        var time = formatted.split(":")[0].length == 1 ? ("0" + formatted.trim()) : formatted.trim();
        time = time.split(":")[1].length == 1 ? (time.split(":")[0] + ":0" + time.split(":")[1]) : time;
        return time;
    };

    function updateTime(times) {
        console.log("Update time called")
    };

    function playAlarm(name, time) {
        if (Notification.permission !== "granted") {
            Notification.requestPermission(function(p) {
                if (p == "granted") playAlarm();
            });
        }
        if (Notification.permission === "granted") {
            var notification = new Notification("Its " + name + " Prayer Time", {
                icon: 'images/icon_48.png',
                body: "Hey there! Please take sometime out to pray. The prayer time starts at " + time
            });
            notification.onshow = function() {
                audio.play();
            };
        }
    };

    function getTimeZone() {
        var z = new Date();
        z = z.toString().split(" ")[5].split(/[a-zA-Z]/);
        z = z[z.length - 1].split("+")[1];
        return (timezone != "") ? timezone : z.slice(0, 2) + "." + z.slice(2);
    };

    function checkTimes() {
        setTimeout(function() {
            if (typeof cordinates[0] != 'undefined' && typeof cordinates[1] != 'undefined') {
                var times = pt.getTimes(new Date(), cordinates, getTimeZone());
                for (var key in times) {
                    var obj = times[key];
                    var playedDate = played.date.setHours(0, 0, 0, 0);
                    var todaysDate = new Date().setHours(0, 0, 0, 0);
                    if (key != "imsak" && key != "midnight" && key != "sunrise" && key != "sunset") {
                        if (todaysDate == playedDate) {
                            if (played.times[key] == true) {
                                continue;
                            }
                        } else {
                            played.date = new Date();
                            played.times[key] = false;
                        }
                        // console.log('current_time',time24Hrs(new Date()));
                        //console.log('obj', obj);
                        if (time24Hrs(new Date()) == obj) {
                            played.times[key] = true;
                            playAlarm(key, obj);
                            console.log('key', key + " played");
                        }
                        // console.log('key',key+" checked");
                    }
                }
            }
            checkTimes();
        }, 1000)
    }
    checkTimes();
    chrome.runtime.onInstalled.addListener(function(details) {
        if (details.reason == "install") {
            console.log("This is a first install!");
            var position;
            var position;
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(pos) {
                    position = pos;
                    console.log(position.coords.latitude);
                    getUserCity(position.coords.latitude, position.coords.longitude, function(city) {
                        console.log(city);
                        console.log(getTimeZone());
                        chrome.storage.sync.set({
                            city: city,
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            timezone: getTimeZone()
                        }, function() {
                            // Update status to let user know options were saved.
                            //alert('Settings Saved');
                        });
                    });
                });
            }
        }
    });

    function getUserCity(lat, lng, ca) {
        var xmlhttp = new XMLHttpRequest()
        var responseData;
        xmlhttp.open("GET", "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + lat + "," + lng, true);
        xmlhttp.send();
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                var responseData = JSON.parse(xmlhttp.responseText);
                var result = responseData.results[0];
                //look for locality tag and administrative_area_level_1
                var city = "";
                var state = "";
                for (var i = 0, len = result.address_components.length; i < len; i++) {
                    var ac = result.address_components[i];
                    if (ac.types.indexOf("administrative_area_level_1") >= 0) state = ac.long_name;
                }
                if (typeof ca == "function") ca(state);
            }
        }
    }
})()