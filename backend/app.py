from flask import Flask, request, jsonify
from flask import Flask, jsonify, Response
from flask_cors import CORS
import os
import pandas as pd
import geopandas as gpd
from AED import filtrar_datos, reduce_to_consecutive_counts, get_categorized_arrays , get_name_states, get_Porcentajes
app = Flask(__name__)
CORS(app)  # ⚠️ Permitir todos los orígenes por ahora


# Array de FIPS que deseas filtrar
FIPS_deseados = [5, 9, 19, 20, 28, 32, 40, 41, 49]  # Este es el array global de FIPS


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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=port)
    app.run(debug=True)
