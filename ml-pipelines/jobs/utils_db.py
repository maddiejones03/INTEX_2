"""
utils_db.py — Reusable database helpers for all pipeline jobs.
Mirrors the Chapter 17 sqlite_conn context manager, but for Azure SQL via pyodbc.
"""

import pyodbc
import pandas as pd
from contextlib import contextmanager
from config import get_connection_string


@contextmanager
def azure_sql_conn():
    """
    Context manager that opens and cleanly closes an Azure SQL connection.

    Usage (identical to Chapter 17's sqlite_conn pattern):
        with azure_sql_conn() as conn:
            df = pd.read_sql("SELECT * FROM supporters", conn)
    """
    conn = pyodbc.connect(get_connection_string())
    try:
        yield conn
    finally:
        conn.close()


def read_table(table_name: str) -> pd.DataFrame:
    """
    Convenience wrapper: read an entire table into a DataFrame.
    Useful during ETL when you need a full table with no filtering.
    """
    with azure_sql_conn() as conn:
        return pd.read_sql(f"SELECT * FROM {table_name}", conn)


def read_query(sql: str) -> pd.DataFrame:
    """
    Run any SELECT query and return results as a DataFrame.

    Usage:
        df = read_query("SELECT supporter_id, status FROM supporters")
    """
    with azure_sql_conn() as conn:
        return pd.read_sql(sql, conn)


def write_predictions(df: pd.DataFrame, table_name: str) -> None:
    """
    Writes a predictions DataFrame back to Azure SQL using MERGE (upsert).
    Re-running inference never creates duplicate rows.

    Convention: the FIRST column of df must be the primary key.

    Args:
        df:         DataFrame of predictions
        table_name: Target table name in Azure SQL
                    (e.g. 'donor_churn_predictions')
    """
    if df.empty:
        print(f"[write_predictions] No rows to write to {table_name}. Skipping.")
        return

    cols   = list(df.columns)
    pk_col = cols[0]   # first column is always the primary key by convention

    with azure_sql_conn() as conn:
        _ensure_predictions_table(conn, table_name, df)

        cursor = conn.cursor()

        col_list     = ", ".join(f"[{c}]" for c in cols)
        placeholders = ", ".join(["?"] * len(cols))
        set_clause   = ", ".join(
            f"target.[{c}] = source.[{c}]" for c in cols if c != pk_col
        )
        src_cols = ", ".join(f"source.[{c}]" for c in cols)

        merge_sql = f"""
        MERGE [{table_name}] AS target
        USING (VALUES ({placeholders})) AS source ({col_list})
        ON target.[{pk_col}] = source.[{pk_col}]
        WHEN MATCHED THEN
            UPDATE SET {set_clause}
        WHEN NOT MATCHED THEN
            INSERT ({col_list}) VALUES ({src_cols});
        """

        rows = [tuple(row) for row in df.itertuples(index=False)]
        cursor.executemany(merge_sql, rows)
        conn.commit()

    print(f"[write_predictions] {len(rows)} rows written to [{table_name}].")


def _ensure_predictions_table(conn, table_name: str, df: pd.DataFrame) -> None:
    """
    Creates the predictions table in Azure SQL if it doesn't exist yet.
    Column types are inferred from DataFrame dtypes.
    The first column is used as the primary key.
    """
    dtype_map = {
        "int64":   "INT",
        "float64": "FLOAT",
        "bool":    "BIT",
        "object":  "NVARCHAR(255)",
    }

    cols = list(df.columns)
    pk   = cols[0]

    col_defs = []
    for col in cols:
        sql_type = dtype_map.get(str(df[col].dtype), "NVARCHAR(255)")
        if col == pk:
            col_defs.append(f"[{col}] {sql_type} PRIMARY KEY")
        else:
            col_defs.append(f"[{col}] {sql_type}")

    create_sql = f"""
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = '{table_name}'
    )
    BEGIN
        CREATE TABLE [{table_name}] (
            {", ".join(col_defs)}
        )
    END
    """

    cursor = conn.cursor()
    cursor.execute(create_sql)
    conn.commit()


def test_connection() -> None:
    """
    Quick sanity check — run this from terminal to confirm credentials work:
        cd ml-pipelines/jobs
        python utils_db.py
    """
    print("Testing Azure SQL connection...")
    with azure_sql_conn() as conn:
        df = pd.read_sql("SELECT TOP 1 1 AS connected", conn)
        print("✅ Connection successful!", df)


if __name__ == "__main__":
    test_connection()