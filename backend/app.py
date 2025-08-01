from flask import Flask, request, jsonify
from flask import Flask, jsonify, Response
from flask_cors import CORS
import os
import pandas as pd
import geopandas as gpd
from AED import filtrar_datos, reduce_to_consecutive_counts, get_categorized_arrays , get_name_states, get_Porcentajes , get_covid_week
from math import radians, sin, cos, sqrt, atan2
app = Flask(__name__)
CORS(app)  # ⚠️ Permitir todos los orígenes por ahora

# Array de FIPS que deseas filtrar
FIPS_deseados = [1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56]


# Nueva ruta para obtener datos de columnas específicas de un dataset

@app.route("/post_column_data", methods=["POST"])
def post_column_data():
    # Obtener los datos de la solicitud
    data = request.get_json()
    dataset_name = data["dataset_name"]
    column_name = data["column_name"]
    
    # Ruta donde los archivos CSV están almacenados (ajustar según el caso)
    dataset_path = f"./datasets/{dataset_name}"

    try:
        # Cargar el dataset
        df = pd.read_csv(dataset_path)
        
        if column_name in df.columns:  # Verifica si la columna existe
            column_data = df[column_name].tolist()  # Convierte la columna en una lista
            return jsonify({"data": column_data})  # Devuelve los datos en formato JSON
        else:
            return jsonify({"error": f"Columna '{column_name}' no encontrada en el dataset '{dataset_name}'"}), 404

    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado en el directorio"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500  # Cualquier otro error

@app.route("/get_column_data", methods=["GET"])
def get_column_data():
    # Especificar manualmente el nombre del archivo CSV aquí
    dataset_name = 'Demografia2021.csv'  # Cambia esto por el nombre de tu archivo CSV
    
    # Cargar el dataset basado en el nombre del archivo especificado
    try:
        df = pd.read_csv(dataset_name)  # Lee el archivo CSV basado en el nombre del dataset
        
        # Convierte todo el dataframe a una lista de diccionarios (cada diccionario es una fila)
        data = df.to_dict(orient="records")
        
        return jsonify({"data": data})  # Devuelve todos los datos en formato JSON
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404

'''
# Nueva ruta para obtener datos GeoJSON de un dataset específico
@app.route("/get_geojson_data", methods=["GET"])
def get_geojson_data():
    # Especificar manualmente el nombre del archivo GeoJSON aquí
    dataset_name = 'usStates.geojson'  # Cambia esto por el nombre de tu archivo GeoJSON
    
    # Cargar el dataset basado en el nombre del archivo especificado
    try:
        # Usar GeoPandas para leer el archivo GeoJSON
        gdf = gpd.read_file(dataset_name)  # Lee el archivo GeoJSON
        
        # Convertir el GeoDataFrame a un diccionario, que es compatible con JSON
        data = gdf.to_json()  # Devuelve el GeoDataFrame en formato GeoJSON
        
        return jsonify(data)  # Devuelve los datos en formato JSON
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404
'''
'''
@app.route("/get_geojson_data", methods=["GET"])
def get_geojson_data():
    # Especificar manualmente el nombre del archivo GeoJSON
    dataset_name = 'StatesFIPS.geojson'  # 'peru_departamental_simple.geojson' # Cambia esto por el nombre de tu archivo GeoJSON
    
    # Cargar el dataset basado en el nombre del archivo especificado
    try:
        # Usar GeoPandas para leer el archivo GeoJSON
        gdf = gpd.read_file(dataset_name)  # Lee el archivo GeoJSON
        
        # Convertir el GeoDataFrame a un diccionario y enviarlo como JSON
        data = gdf.to_json()  # GeoPandas ya devuelve un GeoJSON válido

        # Aseguramos que el tipo de contenido sea 'application/geo+json' en lugar de 'application/json'
        return Response(data, mimetype='application/geo+json')  # Establecer el tipo de contenido adecuado
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404
'''



@app.route("/get_geojson_data", methods=["GET"])
def get_geojson_data():
    # Especificar manualmente el nombre del archivo GeoJSON
    dataset_name = 'StatesFIPS.geojson'  # Cambia esto por el nombre de tu archivo GeoJSON

    
    try:
        # Usar GeoPandas para leer el archivo GeoJSON
        gdf = gpd.read_file(dataset_name)  # Lee el archivo GeoJSON
        
        # Convertir los FIPS_deseados a strings con dos dígitos (e.g., 5 -> "05")
        FIPS_deseados_str = [f"{fips:02d}" for fips in FIPS_deseados]
        
        # Filtrar el GeoDataFrame para incluir solo los features con id en FIPS_deseados
        filtered_gdf = gdf[gdf['id'].isin(FIPS_deseados_str)]
        
        if filtered_gdf.empty:
            return jsonify({"error": "No se encontraron features con los FIPS especificados"}), 404
        
        # Convertir el GeoDataFrame filtrado a un diccionario y enviarlo como JSON
        data = filtered_gdf.to_json()  # GeoPandas ya devuelve un GeoJSON válido

        # Aseguramos que el tipo de contenido sea 'application/geo+json'
        return Response(data, mimetype='application/geo+json')
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404


@app.route("/get_mobility_data", methods=["GET"])
def get_mobility_data():
    # Especificar manualmente el nombre del archivo CSV
    dataset_name = 'Movilidad2021.csv'  # Cambia esto por el nombre de tu archivo CSV

    try:
        # Leer el archivo CSV con Pandas
        df = pd.read_csv(dataset_name)
        
        # Convertir FIPS_deseados a strings con dos dígitos si es necesario (e.g., 5 -> "05")
        # Comentar/descomentar según el formato de los FIPS en tu CSV
      
        # Filtrar las filas donde FIPS_O y FIPS_D estén en FIPS_deseados
        filtered_df = df[df['FIPS_O'].isin(FIPS_deseados) & df['FIPS_D'].isin(FIPS_deseados)]
        # Si los FIPS son enteros, usa:
        # filtered_df = df[df['FIPS_O'].isin(FIPS_deseados) & df['FIPS_D'].isin(FIPS_deseados)]
        
        if filtered_df.empty:
            return jsonify({"error": "No se encontraron datos de movilidad entre los FIPS especificados"}), 404
        
        # Seleccionar solo las columnas deseadas
        result = filtered_df[['FIPS_O', 'FIPS_D', 'Week', 'Pop_flows']]
        
        # Convertir el DataFrame filtrado a JSON
        data = result.to_json(orient='records', lines=False)
        
        # Retornar la respuesta con tipo de contenido 'application/json'
        return Response(data, mimetype='application/json')
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error procesando los datos: {str(e)}"}), 500


@app.route("/post_mobility_data_by_week", methods=["POST"])
def post_mobility_data_by_week():
    # Especificar el nombre del archivo CSV
    dataset_name = 'Movilidad2021.csv'  # Cambia esto por el nombre de tu archivo CSV
    
    try:
        # Obtener el JSON del cuerpo de la solicitud
        data = request.get_json()
        FIPS_O = data["FIPS_O"]
        week = data["week"]
        # Extraer la semana y validar que sea un entero
        try:
            week = int(data['week'])
            if week < 1:
                return jsonify({"error": "La semana debe ser un número entero positivo"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "La semana debe ser un número entero válido"}), 400

        # Leer el archivo CSV con Pandas
        df = pd.read_csv(dataset_name)
        
        # Filtrar las filas donde FIPS_O y FIPS_D estén en FIPS_deseados y Week coincida
        filtered_df = df[
            (df['FIPS_O']== FIPS_O) & 
            (df['FIPS_D'].isin(FIPS_deseados)) & 
            (df['Week'] == week)
        ]
        
        if filtered_df.empty:
            return jsonify({"error": f"No se encontraron datos de movilidad para la semana {week} entre los FIPS especificados"}), 404
        
        # Seleccionar solo las columnas deseadas
        result = filtered_df[['FIPS_O', 'FIPS_D', 'Week', 'Pop_flows']]
        
        # Convertir el DataFrame filtrado a JSON
        data = result.to_json(orient='records', lines=False)
        
        # Retornar la respuesta con tipo de contenido 'application/json'
        return Response(data, mimetype='application/json')
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error procesando los datos: {str(e)}"}), 500
    


@app.route("/post_mobility", methods=["POST"])
def post_mobility():
    # Especificar el nombre del archivo CSV
    dataset_name = 'Movilidad2021.csv'  # Cambia esto por el nombre de tu archivo CSV
    
    try:
        # Obtener el JSON del cuerpo de la solicitud
        data = request.get_json()
        FIPS_O = data["FIPS_O"]
        week = data["week"]
        # Extraer la semana y validar que sea un entero
        try:
            week = int(data['week'])
            if week < 1:
                return jsonify({"error": "La semana debe ser un número entero positivo"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "La semana debe ser un número entero válido"}), 400

        # Leer el archivo CSV con Pandas
        df = pd.read_csv(dataset_name)
        
        # Filtrar las filas donde FIPS_O y FIPS_D estén en FIPS_deseados y Week coincida
        filtered_df = df[
            (df['FIPS_O']== FIPS_O) & 
            (df['FIPS_D'].isin(FIPS_deseados)) & 
            (df['Week'] == week)
        ]
        
        if filtered_df.empty:
            return jsonify({"error": f"No se encontraron datos de movilidad para la semana {week} entre los FIPS especificados"}), 404
        
        # Seleccionar solo las columnas deseadas
        result = filtered_df[[ 'FIPS_D','Pop_flows']]
        
        # Convertir el DataFrame filtrado a JSON
        data = result.to_json(orient='records', lines=False)
        
        # Retornar la respuesta con tipo de contenido 'application/json'
        return Response(data, mimetype='application/json')
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error procesando los datos: {str(e)}"}), 500
   
# Nueva ruta para obtener datos categorizados por FIPS
@app.route("/get_categorized_data", methods=["POST"])
def get_categorized_data():
    # Obtener el FIPS de la solicitud
    data = request.get_json()
    fips = data.get("fips")
    
    # Validar que el FIPS esté presente y sea un entero
    if not fips or not isinstance(fips, int):
        return jsonify({"error": "FIPS es requerido y debe ser un entero"}), 400
    
    # Verificar si el FIPS está en la lista deseada
    if fips not in FIPS_deseados:
        return jsonify({"error": f"FIPS {fips} no está en la lista de FIPS deseados"}), 400
    
    try:
        # Obtener los arrays reducidos usando la función de AED.py
        categorized_data = get_categorized_arrays(fips)
        
        # Devolver los arrays reducidos en formato JSON con el FIPS incluido
        response = {
            "fips": fips,
            **categorized_data
        }
        return jsonify(response)
        
    except FileNotFoundError:
        return jsonify({"error": "Archivo 'Covid2021.csv' no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error procesando los datos: {str(e)}"}), 500
    
@app.route("/get_name", methods=["POST"])
def get_name():
    # Obtener el FIPS de la solicitud
    data = request.get_json()
    fips = data.get("fips")

    name = get_name_states(fips)
    return jsonify(name)




@app.route("/get_porPer", methods=["GET"])
def get_porPer():
    # Asumimos que la función get_Porcentajes está definida y devuelve el DataFrame deseado
    data = get_Porcentajes(FIPS_deseados)
    
    # Convertir el DataFrame a una lista de diccionarios
    data_dict = data.to_dict(orient='records')
    
    # Retornar la respuesta como JSON
    return jsonify(data_dict)

@app.route("/get_geojson_fip", methods=["POST"])
def get_geojson_fip():

    data = request.get_json()
    fips = data.get("fips")
    # Especificar manualmente el nombre del archivo GeoJSON
    dataset_name = 'StatesFIPS.geojson'  # Cambia esto por el nombre de tu archivo GeoJSON
    
    
    try:
        # Usar GeoPandas para leer el archivo GeoJSON
        gdf = gpd.read_file(dataset_name)  # Lee el archivo GeoJSON
        
        # Convertir los FIPS_deseados a strings con dos dígitos (e.g., 5 -> "05")
        FIPS_deseados_str = [f"{fips:02d}"]
        
        # Filtrar el GeoDataFrame para incluir solo los features con id en FIPS_deseados
        filtered_gdf = gdf[gdf['id'].isin(FIPS_deseados_str)]
        
        if filtered_gdf.empty:
            return jsonify({"error": "No se encontraron features con los FIPS especificados"}), 404
        
        # Convertir el GeoDataFrame filtrado a un diccionario y enviarlo como JSON
        data = filtered_gdf.to_json()  # GeoPandas ya devuelve un GeoJSON válido

        # Aseguramos que el tipo de contenido sea 'application/geo+json'
        return Response(data, mimetype='application/geo+json')
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404

@app.route("/get_covid_week_fips", methods=["POST"])
def get_covid_week_fips():
    # Obtener el FIPS de la solicitud
    data = request.get_json()
    fips = data.get("fips")
    
    # Llamar a la función que obtiene el DataFrame
    covid_week = get_covid_week(fips)
    
    # Convertir el DataFrame a JSON
    covid_json = covid_week.to_json(orient='records', lines=False)
        
    # Retornar la respuesta con tipo de contenido 'application/json'
    return Response(covid_json, mimetype='application/json')

@app.route('/api/flujos/<int:fips>/<int:week>')
def get_flujos(fips, week):
    try:
        # Verificar si el FIPS solicitado está en la lista permitida
        if fips not in FIPS_deseados:
            return jsonify({"error": f"El FIPS {fips} no está permitido."}), 403

        # Cargar datos
        df_movilidad = pd.read_csv("Movilidad2021.csv")
        df_demografia = pd.read_csv("Demografia2021.csv")
        
        # Convertir FIPS a int para evitar discrepancias
        df_movilidad['FIPS_O'] = df_movilidad['FIPS_O'].astype(int)
        df_movilidad['FIPS_D'] = df_movilidad['FIPS_D'].astype(int)
        df_demografia['FIPS'] = df_demografia['FIPS'].astype(int)
        
        # Filtrar por semana
        df_week = df_movilidad[df_movilidad['Week'] == week].copy()
        
        # Obtener población (convertir a Python int nativo)
        poblacion_fips = int(df_demografia.loc[df_demografia['FIPS'] == fips, 'Poblacion'].iloc[0])
        
        # --- Flujos de ENTRADA ---
        flujos_in = df_week[(df_week['FIPS_D'] == fips) & (df_week['FIPS_O'].isin(FIPS_deseados))].copy()
        flujos_in = flujos_in.merge(
            df_demografia[['FIPS', 'Poblacion', 'Lat', 'Long']], 
            left_on='FIPS_O', 
            right_on='FIPS'
        )
        flujos_in['Porcentaje'] = (flujos_in['Pop_flows'] / poblacion_fips * 100).round(4)
        # Normalización Min-Max para flujos_in
        if not flujos_in.empty:
            min_in = flujos_in['Pop_flows'].min()
            max_in = flujos_in['Pop_flows'].max()
            if max_in > min_in:
                flujos_in['Normalizado'] = (flujos_in['Pop_flows'] - min_in) / (max_in - min_in)
            else:
                flujos_in['Normalizado'] = 1.0
        else:
            flujos_in['Normalizado'] = []

        # --- Flujos de SALIDA ---
        flujos_out = df_week[(df_week['FIPS_O'] == fips) & (df_week['FIPS_D'].isin(FIPS_deseados))].copy()
        flujos_out = flujos_out.merge(
            df_demografia[['FIPS', 'Poblacion', 'Lat', 'Long']], 
            left_on='FIPS_D', 
            right_on='FIPS'
        )
        flujos_out['Porcentaje'] = (flujos_out['Pop_flows'] / poblacion_fips * 100).round(4)
        # Normalización Min-Max para flujos_out
        if not flujos_out.empty:
            min_out = flujos_out['Pop_flows'].min()
            max_out = flujos_out['Pop_flows'].max()
            if max_out > min_out:
                flujos_out['Normalizado'] = (flujos_out['Pop_flows'] - min_out) / (max_out - min_out)
            else:
                flujos_out['Normalizado'] = 1.0
        else:
            flujos_out['Normalizado'] = []
        # Convertir a tipos nativos de Python
        response = {
            "fips": int(fips),
            "week": int(week),
            "poblacion": poblacion_fips,
            "flujos_in": flujos_in[['FIPS_O', 'Pop_flows', 'Poblacion', 'Porcentaje', 'Lat', 'Long', 'Normalizado']]
                .astype({
                    'FIPS_O': int,
                    'Pop_flows': float,
                    'Poblacion': int,
                    'Porcentaje': float,
                    'Lat': float,
                    'Long': float,
                    'Normalizado': float
                })
                .to_dict('records'),
            "flujos_out": flujos_out[['FIPS_D', 'Pop_flows', 'Poblacion', 'Porcentaje', 'Lat', 'Long', 'Normalizado']]
                .astype({
                    'FIPS_D': int,
                    'Pop_flows': float,
                    'Poblacion': int,
                    'Porcentaje': float,
                    'Lat': float,
                    'Long': float,
                    'Normalizado': float
                })
                .to_dict('records')
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route('/get_population', methods=['GET'])
def get_population():
    try:
        # Cargar el CSV
        df = pd.read_csv('Demografia2021.csv')

        # Asegurar tipos correctos y eliminar nulos
        df = df.dropna(subset=['FIPS', 'Poblacion'])
        df['FIPS'] = df['FIPS'].astype(int)
        df['Poblacion'] = df['Poblacion'].astype(int)

        # Crear diccionario FIPS -> Población
        pop_dict = df.set_index('FIPS')['Poblacion'].to_dict()

        return jsonify(pop_dict)

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

    



from flask import request, jsonify, Response
import pandas as pd

@app.route("/post_mobilityDO", methods=["POST"])
def post_mobilityDO():
    # Especificar el nombre del archivo CSV
    dataset_name = 'Movilidad2021.csv'  # Cambia esto por el nombre de tu archivo CSV
    
    try:
        # Obtener el JSON del cuerpo de la solicitud
        data = request.get_json()
        FIPS_D = data["FIPS_D"]
        week = data["week"]
        
        # Validar FIPS_D como entero
        try:
            FIPS_D = int(data['FIPS_D'])
            if FIPS_D < 1:
                return jsonify({"error": "FIPS_D debe ser un número entero positivo"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "FIPS_D debe ser un número entero válido"}), 400
        
        # Validar week como entero
        try:
            week = int(data['week'])
            if week < 1:
                return jsonify({"error": "La semana debe ser un número entero positivo"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "La semana debe ser un número entero válido"}), 400

        # Leer el archivo CSV con Pandas
        df = pd.read_csv(dataset_name)
        
        # Filtrar las filas donde FIPS_D y Week coincidan
        filtered_df = df[
            (df['FIPS_D'] == FIPS_D) & 
            (df['Week'] == week)
        ]
        
        if filtered_df.empty:
            return jsonify({"error": f"No se encontraron datos de movilidad para la semana {week} con FIPS_D={FIPS_D}"}), 404
        
        # Ordenar por FIPS_D y Week
        sorted_df = filtered_df.sort_values(by=['FIPS_D', 'Week'])
        
        # Seleccionar solo las columnas deseadas
        result = sorted_df[['FIPS_O', 'Pop_flows']]
        
        # Convertir el DataFrame filtrado a JSON
        data = result.to_json(orient='records', lines=False)
        
        # Retornar la respuesta con tipo de contenido 'application/json'
        return Response(data, mimetype='application/json')
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error procesando los datos: {str(e)}"}), 500
    


@app.route("/post_mobility_by_weekdDO", methods=["POST"])
def post_mobility_by_weekDO():
    # Especificar el nombre del archivo CSV
    dataset_name = 'Movilidad2021.csv'  # Cambia esto por el nombre de tu archivo CSV
    
    try:
        # Obtener el JSON del cuerpo de la solicitud
        data = request.get_json()
        FIPS_D = data["FIPS_D"]
        
        # Validar FIPS_D como entero
        try:
            FIPS_D = int(data['FIPS_D'])
            if FIPS_D < 1:
                return jsonify({"error": "FIPS_D debe ser un número entero positivo"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "FIPS_D debe ser un número entero válido"}), 400

        # Leer el archivo CSV con Pandas
        df = pd.read_csv(dataset_name)
        
        # Filtrar las filas donde FIPS_D coincida
        filtered_df = df[df['FIPS_D'] == FIPS_D]
        
        if filtered_df.empty:
            return jsonify({"error": f"No se encontraron datos de movilidad para FIPS_D={FIPS_D}"}), 404
        
        # Agrupar por Week y sumar Pop_flows
        grouped_df = filtered_df.groupby('Week')['Pop_flows'].sum().reset_index()
        
        # Ordenar por Week
        sorted_df = grouped_df.sort_values(by='Week')
        
        # Renombrar columnas para claridad (opcional)
        result = sorted_df.rename(columns={'Week': 'week', 'Pop_flows': 'total_pop_flows'})
        
        # Convertir el DataFrame agrupado a JSON
        data = result.to_json(orient='records', lines=False)
        
        # Retornar la respuesta con tipo de contenido 'application/json'
        return Response(data, mimetype='application/json')
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error procesando los datos: {str(e)}"}), 500
    




# Función de Haversine para calcular la distancia entre dos puntos
def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Radio de la Tierra en km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

# Ruta para obtener los vecinos de un FIPS
@app.route("/get_neighbors", methods=["POST"])
def get_neighbors():
    # Especificar el nombre del archivo CSV
    dataset_name = 'Demografia2021.csv'  # Cambia esto por el nombre de tu archivo CSV
    
    try:
        # Obtener el JSON del cuerpo de la solicitud
        data = request.get_json()
        FIPS = data["FIPS"]
        
        # Validar FIPS como entero
        try:
            FIPS = int(data['FIPS'])
            if FIPS < 1:
                return jsonify({"error": "FIPS debe ser un número entero positivo"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "FIPS debe ser un número entero válido"}), 400

        # Leer el archivo CSV con Pandas
        df = pd.read_csv(dataset_name)
        
        # Verificar si el FIPS existe en el dataset
        target = df[df['FIPS'] == FIPS]
        if target.empty:
            return jsonify({"error": f"No se encontraron datos para FIPS={FIPS}"}), 404
        
        # Obtener las coordenadas del FIPS objetivo
        lat1, lon1 = target.iloc[0]['Lat'], target.iloc[0]['Long']
        
        # Calcular distancias a todos los demás condados
        distances = []
        for _, row in df.iterrows():
            if row['FIPS'] != FIPS:
                lat2, lon2 = row['Lat'], row['Long']
                dist = haversine(lat1, lon1, lat2, lon2)
                distances.append({
                    'FIPS': int(row['FIPS']),
                    'Distance_km': dist,
                    'Lat': row['Lat'],
                    'Long': row['Long'],
                    'Poblacion': int(row['Poblacion'])
                })
        
        # Ordenar por distancia y tomar los k más cercanos
        k = 10  # <--- AQUÍ PUEDES MODIFICAR LA CANTIDAD DE VECINOS
        distances.sort(key=lambda x: x['Distance_km'])
        neighbors = distances[:k]
        
        # Preparar la respuesta
        result = {
            'FIPS': FIPS,
            'Neighbors': neighbors
        }
        
        # Retornar la respuesta con tipo de contenido 'application/json'
        return Response(jsonify(result).get_data(as_text=True), mimetype='application/json')
        
    except FileNotFoundError:
        return jsonify({"error": f"Dataset '{dataset_name}' no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": f"Error procesando los datos: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=port)
    app.run(debug=True)
