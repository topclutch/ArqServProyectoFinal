import axios from 'axios'
import { EXTERNAL_APIS } from '../config/constants'

// Fake Store API
export const fakeStoreApi = axios.create({
  baseURL: EXTERNAL_APIS.FAKE_STORE,
  timeout: 10000
})

// Weather API
export const weatherApi = axios.create({
  baseURL: EXTERNAL_APIS.WEATHER,
  timeout: 10000
})

// Countries API
export const countriesApi = axios.create({
  baseURL: EXTERNAL_APIS.COUNTRIES,
  timeout: 10000
})

// JSONPlaceholder API
export const jsonPlaceholderApi = axios.create({
  baseURL: EXTERNAL_APIS.JSONPLACEHOLDER,
  timeout: 10000
})

// Servicios específicos
export const externalApiService = {
  // Fake Store
  getProducts: () => fakeStoreApi.get('/products'),
  getCategories: () => fakeStoreApi.get('/products/categories'),
  
  // Weather
  getWeather: (city: string, apiKey: string) => 
    weatherApi.get(`/weather?q=${city}&appid=${apiKey}&units=metric`),
  
  // Countries
  getCountries: () => countriesApi.get('/all'),
  getCountryByName: (name: string) => countriesApi.get(`/name/${name}`),
  
  // JSONPlaceholder
  getPosts: () => jsonPlaceholderApi.get('/posts'),
  getUsers: () => jsonPlaceholderApi.get('/users')
}