function saveOptions(button) {
    var city = document.getElementById('city').value;
    var xmlhttp = new XMLHttpRequest()
    var responseData;
    xmlhttp.open("GET", "https://maps.googleapis.com/maps/api/geocode/json?address=" + city + "&sensor=true_or_false", true);
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            button.innerHTML = 'Save';
            responseData = JSON.parse(xmlhttp.responseText);
            //console.log(responseData);
            if (responseData.results.length > 0) {
                chrome.storage.sync.set({
                    city: city,
                    lat: responseData.results[0].geometry.location.lat,
                    lng: responseData.results[0].geometry.location.lng
                }, function() {
                    // Update status to let user know options were saved.
                    //alert('Settings Saved');
                });
            } else {
                alert('City name is not correct');
            }
        }
    }
}
// Event listener for button
var buttonSave = document.getElementById('saveOption');
saveOption.addEventListener("click", function(e) {
    e.preventDefault();
    this.innerHTML = 'Saving...';
    saveOptions(this);
}, false);
/**
 * Update Clock
 **/
var dateBox = document.getElementById('todaysTime');
dateBox.innerHTML = new Date().toString();
(function updateTime() {
    setTimeout(function() {
        var dateBox = document.getElementById('todaysTime');
        dateBox.innerHTML = new Date().toString();
        updateTime();
    }, 1000);
})();
//Update Prayer Time
(function() {
    chrome.storage.sync.get({
        city: '',
        lat: '',
        lng: ''
    }, function(info) {
        document.getElementById('city').value = info.city;
        changePrayerTime(info);
    });
})();

function getTimeZone() {
    var z = new Date();
    z = z.toString().split(" ")[5].split(/[a-zA-Z]/);
    z = z[z.length - 1].split("+")[1];
    return z.slice(0, 2) + "." + z.slice(2);
};
// change listner for google chrome local storage
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
        changePrayerTime(info)
    }
});

function changePrayerTime(info) {
    var prayer = new PrayerTime().getTimes(new Date(), [info.lat, info.lng], getTimeZone());
    document.querySelector('table tbody tr td:nth-of-type(1)').innerHTML = prayer.fajr;
    document.querySelector('table tbody tr td:nth-of-type(2)').innerHTML = prayer.dhuhr;
    document.querySelector('table tbody tr td:nth-of-type(3)').innerHTML = prayer.asr;
    document.querySelector('table tbody tr td:nth-of-type(4)').innerHTML = prayer.maghrib;
    document.querySelector('table tbody tr td:nth-of-type(5)').innerHTML = prayer.isha;
}
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == "install") {
        // console.log("This is a first install!");
        var position;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(pos) {
                position = pos;
                getUserCity(position.coords.latitude, position.coords.longitude, function(city) {
                    console.log(city)
                    chrome.storage.sync.set({
                        city: city,
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }, function() {
                        // Update status to let user know options were saved.
                        //alert('Settings Saved');
                    });
                });
            });
        }
    }
});

function getUserCity(lat, lng) {
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
            return state;
        }
    }
}