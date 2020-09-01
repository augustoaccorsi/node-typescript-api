import { StormGlass, ForecastPoint } from '@src/clients/stormGlass'
import { ForecastController } from '@src/controllers/forecast';
import { InternalError } from '@src/util/errors/internal-erros';
import { Beach } from '@src/models/beach';

export interface BeachModel extends Omit<Beach, '_id'>, Document {}

export interface TimeForecast {
    time: string,
    forecast: BeachForecast[]
}

export interface BeachForecast extends Omit<Beach, 'user'>, ForecastPoint { }

export class ForecastProcessingInternalError extends InternalError {
    constructor(message: string) {
        super(`Unnexpected error during the forecast processing: ${message}`);
    }
}

export class Forecast {
    constructor(protected stormGlass = new StormGlass() ){}

    public async processForecastForBeaches(beaches: Beach[]): Promise<TimeForecast[]>{
        const pointsWithCorrectSources: BeachForecast[] = [];
        try {
        for(const beach of beaches){
            const points = await this.stormGlass.fetchPoints(beach.lat, beach.lng);
            const enrichedBeachData = this.enrichBeachData(points, beach)
            pointsWithCorrectSources.push( ... enrichedBeachData);
        }
        return this.mapForecastByTime(pointsWithCorrectSources);
        }
        catch(err) {
            throw new ForecastProcessingInternalError(err.message); 
        }
    }

    private enrichBeachData(points: ForecastPoint[], beach: Beach): BeachForecast[]{
        return points.map((e) => ({
            ... { // ... spreadoperator
                lat: beach.lat, 
                lng: beach.lng, 
                position: beach.position, 
                name: beach.name, 
                rating: 1
            },
            ... e,
        }));
    }

    private mapForecastByTime(forecast: BeachForecast[]): TimeForecast[] {
        const forecastByTime: TimeForecast[] = [];
        for(const point of forecast) {
            const timePoint = forecastByTime.find((f) => f.time == point.time);
            if(timePoint) {
                timePoint.forecast.push(point);
            }
            else {
                forecastByTime.push({
                    time: point.time,
                    forecast: [point]
                });
            }        
    }    
        return forecastByTime;}
}
