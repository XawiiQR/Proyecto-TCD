# AED.py
import pandas as pd
import numpy as np

# Array de FIPS que deseas filtrar
FIPS_deseados = [1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56]

def filtrar_datos(fips):
    # Cargar los datos desde el archivo CSV
    covid = pd.read_csv('Covid2021.csv')

    # Filtrar los datos por FIPS y crear una copia explícita
    covidFips = covid[covid['FIPS'] == fips].copy()
    
    # Normalizar las columnas 'New_Cases', 'New_Deaths' y 'Susceptible' utilizando Min-Max
    covidFips.loc[:, 'New_Cases_Normalized'] = (covidFips['New_Cases'] - covidFips['New_Cases'].min()) / (covidFips['New_Cases'].max() - covidFips['New_Cases'].min())
    covidFips.loc[:, 'New_Deaths_Normalized'] = (covidFips['New_Deaths'] - covidFips['New_Deaths'].min()) / (covidFips['New_Deaths'].max() - covidFips['New_Deaths'].min())
    covidFips.loc[:, 'Susceptible_Normalized'] = (covidFips['Susceptible'] - covidFips['Susceptible'].min()) / (covidFips['Susceptible'].max() - covidFips['Susceptible'].min())

    # Crear las categorías para los datos normalizados
    covidFipsFinal = covidFips[['FIPS', 'Week']].copy()

    # Crear nuevas columnas categorizadas según los valores normalizados (5 niveles)
    covidFipsFinal.loc[:, 'New_Cases_Category'] = np.select(
        [covidFips['New_Cases_Normalized'] < 0.2, 
         (covidFips['New_Cases_Normalized'] >= 0.2) & (covidFips['New_Cases_Normalized'] < 0.4),
         (covidFips['New_Cases_Normalized'] >= 0.4) & (covidFips['New_Cases_Normalized'] < 0.6),
         (covidFips['New_Cases_Normalized'] >= 0.6) & (covidFips['New_Cases_Normalized'] < 0.8),
         covidFips['New_Cases_Normalized'] >= 0.8],
        [1, 2, 3, 4, 5], 
        default=np.nan
    )

    covidFipsFinal.loc[:, 'New_Deaths_Category'] = np.select(
        [covidFips['New_Deaths_Normalized'] < 0.2, 
         (covidFips['New_Deaths_Normalized'] >= 0.2) & (covidFips['New_Deaths_Normalized'] < 0.4),
         (covidFips['New_Deaths_Normalized'] >= 0.4) & (covidFips['New_Deaths_Normalized'] < 0.6),
         (covidFips['New_Deaths_Normalized'] >= 0.6) & (covidFips['New_Deaths_Normalized'] < 0.8),
         covidFips['New_Deaths_Normalized'] >= 0.8],
        [1, 2, 3, 4, 5], 
        default=np.nan
    )

    covidFipsFinal.loc[:, 'Susceptible_Category'] = np.select(
        [covidFips['Susceptible_Normalized'] < 0.2, 
         (covidFips['Susceptible_Normalized'] >= 0.2) & (covidFips['Susceptible_Normalized'] < 0.4),
         (covidFips['Susceptible_Normalized'] >= 0.4) & (covidFips['Susceptible_Normalized'] < 0.6),
         (covidFips['Susceptible_Normalized'] >= 0.6) & (covidFips['Susceptible_Normalized'] < 0.8),
         covidFips['Susceptible_Normalized'] >= 0.8],
        [1, 2, 3, 4, 5], 
        default=np.nan
    )
    
    return covidFipsFinal

# Función para reducir el array a formato valor_conteo consecutivos
def reduce_to_consecutive_counts(arr):
    if len(arr) == 0:
        return []
    result = []
    current_value = arr[0]
    count = 1
    
    for i in range(1, len(arr)):
        if arr[i] == current_value:
            count += 1
        else:
            result.append(f"{int(current_value)}_{count}")
            current_value = arr[i]
            count = 1
    result.append(f"{int(current_value)}_{count}")
    return result

# Nueva función para unir y devolver los arrays reducidos
def get_categorized_arrays(fips):
    resultado = filtrar_datos(fips)
    new_cases_array = resultado['New_Cases_Category'].dropna().values
    new_deaths_array = resultado['New_Deaths_Category'].dropna().values
    reduced_array_new_cases = reduce_to_consecutive_counts(new_cases_array)
    reduced_array_new_deaths = reduce_to_consecutive_counts(new_deaths_array)
    return {
        "new_cases_category": reduced_array_new_cases,
        "new_deaths_category": reduced_array_new_deaths
    }


def get_name_states(fips):
    # Cargar los datos desde el archivo CSV
    covid = pd.read_csv('nameStates.csv')
    
    # Eliminar espacios al principio y al final de los nombres de las columnas
    covid.columns = covid.columns.str.strip()

    # Filtrar los datos por FIPS
    covidFips = covid[covid['FIPS'] == fips].copy()  # Asegúrate de que 'FIPS' esté correcto

    # Obtener el nombre del estado correspondiente al FIPS
    if not covidFips.empty:
        return covidFips['State'].iloc[0]  # Retorna el primer valor de 'State' encontrado
    else:
        return None  # Si no se encuentra el FIPS, retorna None

# Llamada de ejemplo para probar la función
#print(get_name_states(1))  # Reemplaza el número con el FIPS que desees buscar  # Llamada de ejemplo para probar la función

def get_Porcentajes(arr):
    # Leer los archivos CSV
    covid = pd.read_csv('Covid2021.csv')
    demo = pd.read_csv('Demografia2021.csv')
    
    # Sumar por FIPS las nuevas muertes, casos y susceptibles
    result = covid.groupby('FIPS')[['New_Cases', 'New_Deaths', 'Susceptible']].sum().reset_index()
    
    # Unir los datos de covid con la información demográfica por FIPS
    covidFin = pd.merge(result, demo, on='FIPS')
    
    # Filtrar solo los FIPS que están en el array 'arr'
    covidFin = covidFin[covidFin['FIPS'].isin(arr)].reset_index()
    
    # Calcular los porcentajes por población
    covidFin["New_case_por_Population"] = (covidFin["New_Cases"] / covidFin["Poblacion"]).round(4)
    covidFin["New_death_por_Population"] = (covidFin["New_Deaths"] / covidFin["Poblacion"]).round(4)
    covidFin["Susceptible_por_Population"] = (covidFin["Susceptible"] / covidFin["Poblacion"]).round(4)
    
    # Seleccionar solo las columnas que desees
    columnas_deseadas = ['FIPS', 
                         'New_case_por_Population', 'New_death_por_Population', 'Susceptible_por_Population']
    
    covidFin = covidFin[columnas_deseadas]
    
    # Retornar el DataFrame final con las columnas seleccionadas y los FIPS deseados
    return(covidFin)


def get_Porcentajes_fips(arr):
    # Leer los archivos CSV
    covid = pd.read_csv('Covid2021.csv')
    demo = pd.read_csv('Demografia2021.csv')
    
    # Sumar por FIPS las nuevas muertes, casos y susceptibles
    result = covid.groupby('FIPS')[['New_Cases', 'New_Deaths', 'Susceptible']].sum().reset_index()
    
    # Unir los datos de covid con la información demográfica por FIPS
    covidFin = pd.merge(result, demo, on='FIPS')
    
    # Filtrar solo los FIPS que están en el array 'arr'
    covidFin = covidFin[covidFin['FIPS']== arr].reset_index()
    
    # Calcular los porcentajes por población
    covidFin["New_case_por_Population"] = (covidFin["New_Cases"] / covidFin["Poblacion"]).round(4)
    covidFin["New_death_por_Population"] = (covidFin["New_Deaths"] / covidFin["Poblacion"]).round(4)
    covidFin["Susceptible_por_Population"] = (covidFin["Susceptible"] / covidFin["Poblacion"]).round(4)
    
    # Seleccionar solo las columnas que desees
    columnas_deseadas = ['FIPS', 
                         'New_case_por_Population', 'New_death_por_Population', 'Susceptible_por_Population']
    
    covidFin = covidFin[columnas_deseadas]
    
    # Retornar el DataFrame final con las columnas seleccionadas y los FIPS deseados
    return(covidFin)
def get_covid_week(fips):
    # Cargar los datos desde el archivo CSV
    covid = pd.read_csv('Covid2021.csv')

    # Filtrar los datos por FIPS
    covidFips = covid[covid['FIPS'] == fips].copy()
    
    # Normalizar las columnas 'New_Cases', 'New_Deaths' y 'Susceptible' utilizando Min-Max
    covidFips.loc[:, 'New_Cases_Normalized'] = (covidFips['New_Cases'] - covidFips['New_Cases'].min()) / (covidFips['New_Cases'].max() - covidFips['New_Cases'].min())
    covidFips.loc[:, 'New_Deaths_Normalized'] = (covidFips['New_Deaths'] - covidFips['New_Deaths'].min()) / (covidFips['New_Deaths'].max() - covidFips['New_Deaths'].min())
    covidFips.loc[:, 'Susceptible_Normalized'] = (covidFips['Susceptible'] - covidFips['Susceptible'].min()) / (covidFips['Susceptible'].max() - covidFips['Susceptible'].min())

    # Agrupar por semana y sumar las nuevas muertes y casos
    covid_weekly = covidFips.groupby('Week')[['New_Cases_Normalized', 'New_Deaths_Normalized', "Susceptible_Normalized"]].sum().reset_index()

    # Renombrar las columnas para mayor claridad (si es necesario)
    covid_weekly.rename(columns={'New_Cases_Normalized': 'New_Cases_Normalized', 'New_Deaths_Normalized': 'New_Deaths_Normalized', 'Susceptible_Normalized': 'Susceptible_Normalized'}, inplace=True)

    return covid_weekly


print(filtrar_datos(5))

#print(get_covid_week(5))  # Llamada de ejemplo para probar la función