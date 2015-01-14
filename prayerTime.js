var PrayerTime = function(method) {
    // Time Names
    this.timeNames = {
        imsak: 'Imsak',
        fajr: 'Fajr',
        sunrise: 'Sunrise',
        dhuhr: 'Dhuhr',
        asr: 'Asr',
        sunset: 'Sunset',
        maghrib: 'Maghrib',
        isha: 'Isha',
        midnight: 'Midnight'
    };
    // Calculation Methods
    this.methods = {
        MWL: {
            name: 'Muslim World League',
            params: {
                fajr: 18,
                isha: 17
            }
        },
        ISNA: {
            name: 'Islamic Society of North America (ISNA)',
            params: {
                fajr: 15,
                isha: 15
            }
        },
        Egypt: {
            name: 'Egyptian General Authority of Survey',
            params: {
                fajr: 19.5,
                isha: 17.5
            }
        },
        Makkah: {
            name: 'Umm Al-Qura University, Makkah',
            params: {
                fajr: 18.5,
                isha: '90 min'
            }
        }, // fajr was 19 degrees before 1430 hijri
        Karachi: {
            name: 'University of Islamic Sciences, Karachi',
            params: {
                fajr: 18,
                isha: 18
            }
        },
        Tehran: {
            name: 'Institute of Geophysics, University of Tehran',
            params: {
                fajr: 17.7,
                isha: 14,
                maghrib: 4.5,
                midnight: 'Jafari'
            }
        }, // isha is not explicitly specified in this method
        Jafari: {
            name: 'Shia Ithna-Ashari, Leva Institute, Qum',
            params: {
                fajr: 16,
                isha: 14,
                maghrib: 4,
                midnight: 'Jafari'
            }
        }
    };
    // Default Parameters in Calculation Methods
    this.defaultParams = {
        maghrib: '0 min',
        midnight: 'Standard'
    };
    
 
    //---------------------- Default Settings --------------------
    this.calcMethod = 'MWL';
    // do not change anything here; use adjust method instead
    this.setting = {
        imsak: '10 min',
        dhuhr: '0 min',
        asr: 'Standard',
        highLats: 'NightMiddle'
    };
    this.timeFormat = '24h';
    this.timeSuffixes = ['am', 'pm'];
    this.invalidTime = '-----';
    this.numIterations = 1;
    this.offset = {};
    //----------------------- Local Variables ---------------------
    // coordinates
    this.lat;
    this.lng;
    this.elv;
    // time variables    
    this.timeZone;
    this.jDate;
    // set methods defaults
    this.defParams = this.defaultParams;
    for (var i in this.methods) {
        var params = this.methods[i].params;
        for (var j in this.defParams)
            if ((typeof(params[j]) == 'undefined')) params[j] = this.defParams[j];
    };
    // initialize settings
    this.calcMethod = this.methods[method] ? this.method : this.calcMethod;
    var params = this.methods[this.calcMethod].params;
    for (var id in params) this.setting[id] = params[id];
    // init time offsets
    for (var i in this.timeNames) this.offset[i] = 0;
};
PrayerTime.prototype.setMethod = function(method) {
    if (this.methods[method]) {
        this.adjust(this.methods[method].params);
        this.calcMethod = method;
    }
    return this;
};
PrayerTime.prototype.adjust = function(params) {
    for (var id in params) this.setting[id] = params[id];
};
PrayerTime.prototype.tune = function(timeOffsets) {
    for (var i in timeOffsets) this.offset[i] = timeOffsets[i];
};
PrayerTime.prototype.getMethod = function() {
    return this.calcMethod;
};
PrayerTime.prototype.getSetting = function() {
    return this.setting;
};
PrayerTime.prototype.getOffsets = function() {
    return this.offset
}
PrayerTime.prototype.getDefaults = function() {
    // body...
    return this.methods;
};
// get default calc parametrs
PrayerTime.prototype.getTimes = function(date, coords, timezone, dst, format) {
    this.lat = 1 * coords[0];
    this.lng = 1 * coords[1];
    this.elv = coords[2] ? 1 * coords[2] : 0;
    this.timeFormat = format || this.timeFormat;
    if (date.constructor === Date) date = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
    if (typeof(timezone) == 'undefined' || timezone == 'auto') timezone = this.getTimeZone(date);
    if (typeof(dst) == 'undefined' || dst == 'auto') dst = this.getDst(date);
    this.timeZone = 1 * timezone + (1 * dst ? 1 : 0);
    this.jDate = this.julian(date[0], date[1], date[2]) - this.lng / (15 * 24);
    return this.computeTimes();
};
PrayerTime.prototype.getFormattedTime = function(time, format, suffixes) {
    if (isNaN(time)) return invalidTime;
    if (format == 'Float') return time;
    suffixes = suffixes || this.timeSuffixes;
    time = DMath.fixHour(time + 0.5 / 60); // add 0.5 minutes to round
    var hours = Math.floor(time);
    var minutes = Math.floor((time - hours) * 60);
    var suffix = (format == '12h') ? suffixes[hours < 12 ? 0 : 1] : '';
    var hour = (format == '24h') ? this.twoDigitsFormat(hours) : ((hours + 12 - 1) % 12 + 1);
    return hour + ':' + this.twoDigitsFormat(minutes) + (suffix ? ' ' + suffix : '');
};
// compute mid-day time
PrayerTime.prototype.midDay = function(time) {
    var eqt = this.sunPosition(this.jDate + time).equation;
    var noon = DMath.fixHour(12 - eqt);
    return noon;
};
PrayerTime.prototype.sunAngleTime = function(angle, time, direction) {
    var decl = this.sunPosition(this.jDate + time).declination;
    var noon = this.midDay(time);
    var t = 1 / 15 * DMath.arccos((-DMath.sin(angle) - DMath.sin(decl) * DMath.sin(this.lat)) / (DMath.cos(decl) * DMath.cos(this.lat)));
    return noon + (direction == 'ccw' ? -t : t);
};
PrayerTime.prototype.asrTime = function(factor, time) {
    var decl = this.sunPosition(this.jDate + time).declination;
    
    var angle = -DMath.arccot(factor + DMath.tan(Math.abs(this.lat - decl)));
    
   
    return this.sunAngleTime(angle, time);
};
// compute declination angle of sun and equation of time
// Ref: http://aa.usno.navy.mil/faq/docs/SunApprox.php
PrayerTime.prototype.sunPosition = function(jd) {
    var D = jd - 2451545.0;
    var g = DMath.fixAngle(357.529 + 0.98560028 * D);
    var q = DMath.fixAngle(280.459 + 0.98564736 * D);
    var L = DMath.fixAngle(q + 1.915 * DMath.sin(g) + 0.020 * DMath.sin(2 * g));
    var R = 1.00014 - 0.01671 * DMath.cos(g) - 0.00014 * DMath.cos(2 * g);
    var e = 23.439 - 0.00000036 * D;
    var RA = DMath.arctan2(DMath.cos(e) * DMath.sin(L), DMath.cos(L)) / 15;
    var eqt = q / 15 - DMath.fixHour(RA);
    var decl = DMath.arcsin(DMath.sin(e) * DMath.sin(L));
    return {
        declination: decl,
        equation: eqt
    };
};
// convert Gregorian date to Julian day
// Ref: Astronomical Algorithms by Jean Meeus
PrayerTime.prototype.julian = function(year, month, day) {
    if (month <= 2) {
        year -= 1;
        month += 12;
    };
    var A = Math.floor(year / 100);
    var B = 2 - A + Math.floor(A / 4);
    var JD = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
    return JD;
};
//---------------------- Compute Prayer Times -----------------------
PrayerTime.prototype.computePrayerTimes = function(times) {
    times = this.dayPortion(times);
    var params = this.setting;
    var imsak = this.sunAngleTime(this.eval(params.imsak), times.imsak, 'ccw');
    var fajr = this.sunAngleTime(this.eval(params.fajr), times.fajr, 'ccw');
    var sunrise = this.sunAngleTime(this.riseSetAngle(), times.sunrise, 'ccw');
    var dhuhr = this.midDay(times.dhuhr);
  
    var asr = this.asrTime(this.asrFactor(params.asr), times.asr);
    var sunset = this.sunAngleTime(this.riseSetAngle(), times.sunset);
    var maghrib = this.sunAngleTime(this.eval(params.maghrib), times.maghrib);
    var isha = this.sunAngleTime(this.eval(params.isha), times.isha);
    return {
        imsak: imsak,
        fajr: fajr,
        sunrise: sunrise,
        dhuhr: dhuhr,
        asr: asr,
        sunset: sunset,
        maghrib: maghrib,
        isha: isha
    };
};
PrayerTime.prototype.computeTimes = function() {
    // default times
    var times = {
        imsak: 5,
        fajr: 5,
        sunrise: 6,
        dhuhr: 12,
        asr: 13,
        sunset: 18,
        maghrib: 18,
        isha: 18
    };
    // main iterations
    for (var i = 1; i <= this.numIterations; i++) times = this.computePrayerTimes(times);
    times = this.adjustTimes(times);
    // add midnight time
    times.midnight = (this.setting.midnight == 'Jafari') ? times.sunset + this.timeDiff(times.sunset, times.fajr) / 2 : times.sunset + this.timeDiff(times.sunset, times.sunrise) / 2;
    times = this.tuneTimes(times);
    return this.modifyFormats(times);
}
PrayerTime.prototype.adjustTimes = function(times) {
    var params = this.setting;
    for (var i in times) times[i] += this.timeZone - this.lng / 15;
    if (params.highLats != 'None') times = this.adjustHighLats(times);
    if (this.isMin(params.imsak)) times.imsak = times.fajr - this.eval(params.imsak) / 60;
    if (this.isMin(params.maghrib)) times.maghrib = times.sunset + this.eval(params.maghrib) / 60;
    if (this.isMin(params.isha)) times.isha = times.maghrib + this.eval(params.isha) / 60;
    times.dhuhr += this.eval(params.dhuhr) / 60;
    return times;
}
PrayerTime.prototype.asrFactor = function(asrFactor) {
    var factor = {
        Standard: 1,
        Hanafi: 2
    }[asrFactor];
   
    return factor || this.eval(this.asrParam);
};
PrayerTime.prototype.riseSetAngle = function() {
    //var earthRad = 6371009; // in meters
    //var angle = DMath.arccos(earthRad/(earthRad+ elv));
    var angle = 0.0347 * Math.sqrt(this.elv); // an approximation
    return 0.833 + angle;
};
PrayerTime.prototype.tuneTimes = function(times) {
    for (var i in times) times[i] += this.offset[i] / 60;
    return times;
};
PrayerTime.prototype.modifyFormats = function(times) {
    for (var i in times) times[i] = this.getFormattedTime(times[i], this.timeFormat);
    return times;
};
PrayerTime.prototype.adjustHighLats = function(times) {
    var params = this.setting;
    var nightTime = this.timeDiff(times.sunset, times.sunrise);
    times.imsak = this.adjustHLTime(times.imsak, times.sunrise, this.eval(params.imsak), nightTime, 'ccw');
    times.fajr = this.adjustHLTime(times.fajr, times.sunrise, this.eval(params.fajr), nightTime, 'ccw');
    times.isha = this.adjustHLTime(times.isha, times.sunset, this.eval(params.isha), nightTime);
    times.maghrib = this.adjustHLTime(times.maghrib, times.sunset, this.eval(params.maghrib), nightTime);
    return times;
};
PrayerTime.prototype.adjustHLTime = function(time, base, angle, night, direction) {
    var portion = this.nightPortion(angle, night);
    var timeDiff = (direction == 'ccw') ? this.timeDiff(time, base) : this.timeDiff(base, time);
    if (isNaN(time) || timeDiff > portion) time = base + (direction == 'ccw' ? -portion : portion);
    return time;
};
PrayerTime.prototype.nightPortion = function(angle, night) {
    var method = this.setting.highLats;
    var portion = 1 / 2 // MidNight
    if (method == 'AngleBased') portion = 1 / 60 * angle;
    if (method == 'OneSeventh') portion = 1 / 7;
    return portion * night;
};
PrayerTime.prototype.dayPortion = function(times) {
    for (var i in times) times[i] /= 24;
    return times;
};
PrayerTime.prototype.getTimeZone = function(date) {
    var year = date[0];
    var t1 = this.gmtOffset([year, 0, 1]);
    var t2 = this.gmtOffset([year, 6, 1]);
    return Math.min(t1, t2);
};
// get daylight saving for a given date 
PrayerTime.prototype.getDst = function(date) {
    return 1 * (this.gmtOffset(date) != this.getTimeZone(date));
};
// GMT offset for a given date
PrayerTime.prototype.gmtOffset = function(date) {
    var localDate = new Date(date[0], date[1] - 1, date[2], 12, 0, 0, 0);
    var GMTString = localDate.toGMTString();
    var GMTDate = new Date(GMTString.substring(0, GMTString.lastIndexOf(' ') - 1));
    var hoursDiff = (localDate - GMTDate) / (1000 * 60 * 60);
    return hoursDiff;
};
//---------------------- Misc Functions -----------------------
// convert given string into a number
PrayerTime.prototype.eval = function(str) {
    return 1 * (str + '').split(/[^0-9.+-]/)[0];
};
// detect if input contains 'min'
PrayerTime.prototype.isMin = function(arg) {
    return (arg + '').indexOf('min') != -1;
};
// compute the difference between two times
PrayerTime.prototype.timeDiff = function(time1, time2) {
    return DMath.fixHour(time2 - time1);
};
// add a leading 0 if necessary
PrayerTime.prototype.twoDigitsFormat = function(num) {
    return (num < 10) ? '0' + num : num;
};
var DMath = {
    dtr: function(d) {
        return (d * Math.PI) / 180.0;
    },
    rtd: function(r) {
        return (r * 180.0) / Math.PI;
    },
    sin: function(d) {
        return Math.sin(this.dtr(d));
    },
    cos: function(d) {
        return Math.cos(this.dtr(d));
    },
    tan: function(d) {
        return Math.tan(this.dtr(d));
    },
    arcsin: function(d) {
        return this.rtd(Math.asin(d));
    },
    arccos: function(d) {
        return this.rtd(Math.acos(d));
    },
    arctan: function(d) {
        return this.rtd(Math.atan(d));
    },
    arccot: function(x) {
        return this.rtd(Math.atan(1 / x));
    },
    arctan2: function(y, x) {
        return this.rtd(Math.atan2(y, x));
    },
    fixAngle: function(a) {
        return this.fix(a, 360);
    },
    fixHour: function(a) {
        return this.fix(a, 24);
    },
    fix: function(a, b) {
        a = a - b * (Math.floor(a / b));
        return (a < 0) ? a + b : a;
    }
}