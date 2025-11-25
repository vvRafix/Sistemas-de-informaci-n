import React, { useEffect, useState } from "react";

function ServiciosBorrados() {
  const [borrados, setBorrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("https://sevenelectricmanage.onrender.com/servicios-borrados")
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar servicios borrados");
        return res.json();
      })
      .then((data) => {
        setBorrados(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id_borrado) => {
    if (!window.confirm("¿Eliminar definitivamente este servicio?")) return;
    try {
      const res = await fetch(`https://sevenelectricmanage.onrender.com/servicios-borrados/${id_borrado}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Error al eliminar definitivamente");
      setBorrados((prev) => prev.filter((s) => s.id_borrado !== id_borrado));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestore = async (id_borrado) => {
    if (!window.confirm("¿Restaurar este servicio desde la papelera?")) return;
    try {
      const res = await fetch(`https://sevenelectricmanage.onrender.com/servicios-borrados/${id_borrado}/restore`, { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Error al restaurar');
      }
      const data = await res.json();
      // quitar el elemento restaurado de la lista
      setBorrados((prev) => prev.filter((s) => s.id_borrado !== id_borrado));
      alert('Servicio restaurado correctamente');
    } catch (err) {
      alert(err.message || 'Error al restaurar');
    }
  };

  if (loading) return <p>Cargando servicios borrados...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Servicios de mantención</h2>
      {borrados.length === 0 ? (
        <p>No hay servicios en la papelera.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th className="tbl-th">ID Borrado</th>
              <th className="tbl-th">ID Original</th>
              <th className="tbl-th">Tipo</th>
              <th className="tbl-th">Descripción</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Fecha Ingreso</th>
              <th className="tbl-th">Fecha Entrega</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {borrados.map((s, idx) => (
              <tr key={s.id_borrado} className={`tbl-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                <td className="tbl-td center">{s.id_borrado}</td>
                <td className="tbl-td center">{s.id_original}</td>
                <td className="tbl-td">{s.tipo}</td>
                <td className="tbl-td">{s.descripcion}</td>
                <td className="tbl-td center">{s.estado}</td>
                <td className="tbl-td center">{s.fechaIngreso}</td>
                <td className="tbl-td center">{s.fechaEntrega || "-"}</td>
                <td className="tbl-td center" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => handleRestore(s.id_borrado)} className="btn-primary small">Restaurar</button>
                  <button onClick={() => handleDelete(s.id_borrado)} className="btn-danger small">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ServiciosBorrados;
