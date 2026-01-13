import * as Location from 'expo-location';

class WeatherService {
  async get() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return this._fallback('Location permission denied');
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,weather_code&timezone=auto`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather API ${res.status}`);

      const data = await res.json();
      const temp = Math.round(data.current.temperature_2m);
      const desc = this._codeToDesc(data.current.weather_code);

      let city = 'Your Location';
      try {
        const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addr) city = addr.city || addr.subregion || addr.region || city;
      } catch {}

      return { temperature: temp, description: desc, formatted: `${temp}°C, ${desc}`, city };
    } catch (err) {
      return this._fallback(err.message);
    }
  }

  _fallback(reason) {
    return {
      temperature: 28,
      description: 'Partly Cloudy',
      formatted: '28°C, Partly Cloudy',
      city: 'Unknown',
      fallback: true,
      reason,
    };
  }

  _codeToDesc(c) {
    const m = {
      0:'Clear Sky',1:'Mainly Clear',2:'Partly Cloudy',3:'Overcast',
      45:'Foggy',48:'Rime Fog',51:'Light Drizzle',53:'Drizzle',55:'Dense Drizzle',
      61:'Light Rain',63:'Rain',65:'Heavy Rain',71:'Light Snow',73:'Snow',75:'Heavy Snow',
      80:'Rain Showers',81:'Mod Rain Showers',82:'Heavy Showers',
      95:'Thunderstorm',96:'Thunderstorm + Hail',99:'Severe Thunderstorm',
    };
    return m[c] || 'Clear Sky';
  }
}

export default new WeatherService();