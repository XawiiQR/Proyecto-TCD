# AED.py
import pandas as pd
import numpy as np

# Array de FIPS que deseas filtrar
FIPS_deseados = [5, 9, 19, 20, 28, 32, 40, 41, 49]  # Este es el array global de FIPS

def filtrar_datos(fips):
    # Cargar los datos desde el archivo CSV
    covid = pd.read_csv('Covid2021.csv')

    # Filtrar los datos por FIPS y crear una copia explícita
    covidFips = covid[covid['FIPS'] == fips].copy()
    
    # Normalizar las columnas 'New_Cases', 'New_Deaths' y 'Susceptible' utilizando Min-Max
    covidFips.loc[:, 'New_Cases_Normalized'] = (covidFips['New_Cases'] - covidFips['New_Cases'].min()) / (covidFips['New_Cases'].max() - covidFips['New_Cases'].min())
    covidFips.loc[:, 'New_Deaths_Normalized'] = (covidFips['New_Deaths'] - covidFips['New_Deaths'].min()) / (covidFips['New_Deaths'].max() - covidFips['New_Deaths'].min())
    covidFips.loc[:, 'Susceptible_Normalized'] = (covidFips['Susceptible'] - covidFips['Susceptible'].min()) / (covidFips['Susceptible'].max() - covidFips['Susceptible'].min())

    # Calcular los percentiles
    p25_New_Cases = np.percentile(covidFips['New_Cases_Normalized'], 25)
    p50_New_Cases = np.percentile(covidFips['New_Cases_Normalized'], 50)
    p75_New_Cases = np.percentile(covidFips['New_Cases_Normalized'], 75)

    p25_New_Deaths = np.percentile(covidFips['New_Deaths_Normalized'], 25)
    p50_New_Deaths = np.percentile(covidFips['New_Deaths_Normalized'], 50)
    p75_New_Deaths = np.percentile(covidFips['New_Deaths_Normalized'], 75)

    p25_Susceptible = np.percentile(covidFips['Susceptible_Normalized'], 25)
    p50_Susceptible = np.percentile(covidFips['Susceptible_Normalized'], 50)
    p75_Susceptible = np.percentile(covidFips['Susceptible_Normalized'], 75)

    covidFipsFinal = covidFips[['FIPS', 'Week']].copy()
    # Crear nuevas columnas categorizadas según los percentiles
    covidFipsFinal.loc[:, 'New_Cases_Category'] = np.select(
        [covidFips['New_Cases_Normalized'] < p25_New_Cases, 
         (covidFips['New_Cases_Normalized'] >= p25_New_Cases) & (covidFips['New_Cases_Normalized'] < p50_New_Cases),
         (covidFips['New_Cases_Normalized'] >= p50_New_Cases) & (covidFips['New_Cases_Normalized'] < p75_New_Cases),
         covidFips['New_Cases_Normalized'] >= p75_New_Cases],
        [1, 2, 3, 4], 
        default=np.nan
    )

    covidFipsFinal.loc[:, 'New_Deaths_Category'] = np.select(
        [covidFips['New_Deaths_Normalized'] < p25_New_Deaths, 
         (covidFips['New_Deaths_Normalized'] >= p25_New_Deaths) & (covidFips['New_Deaths_Normalized'] < p50_New_Deaths),
         (covidFips['New_Deaths_Normalized'] >= p50_New_Deaths) & (covidFips['New_Deaths_Normalized'] < p75_New_Deaths),
         covidFips['New_Deaths_Normalized'] >= p75_New_Deaths],
        [1, 2, 3, 4], 
        default=np.nan
    )

    covidFipsFinal.loc[:, 'Susceptible_Category'] = np.select(
        [covidFips['Susceptible_Normalized'] < p25_Susceptible, 
         (covidFips['Susceptible_Normalized'] >= p25_Susceptible) & (covidFips['Susceptible_Normalized'] < p50_Susceptible),
         (covidFips['Susceptible_Normalized'] >= p50_Susceptible) & (covidFips['Susceptible_Normalized'] < p75_Susceptible),
         covidFips['Susceptible_Normalized'] >= p75_Susceptible],
        [1, 2, 3, 4], 
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

# Llamar a la función
get_Porcentajes(FIPS_deseados)

