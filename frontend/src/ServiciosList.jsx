import React, { useEffect, useState } from "react";

function ServiciosList() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para el formulario
  const [form, setForm] = useState({
    tipo: "",
    descripcion: "",
    estado: "en proceso",
    fechaIngreso: ""
  });
  const [formError, setFormError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("https://sevenelectricmanage.onrender.com/servicios")
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar servicios");
        return res.json();
      })
      .then((data) => {
        setServicios(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.tipo || !form.descripcion || !form.fechaIngreso) {
      setFormError("Todos los campos son obligatorios");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("https://sevenelectricmanage.onrender.com/servicios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Error al registrar servicio");
      const nuevo = await res.json();
      setServicios((prev) => [...prev, nuevo]);
      setForm({ tipo: "", descripcion: "", estado: "en proceso", fechaIngreso: "" });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  // Mover servicio a la papelera con motivo (cancelado/terminado)
  const handleMoveToPaper = async (id, motivo) => {
    if (!['cancelado', 'terminado'].includes(motivo)) return;
    if (!window.confirm(`¿Confirma mover el servicio ${id} como '${motivo}'?`)) return;
    try {
      const res = await fetch(`https://sevenelectricmanage.onrender.com/servicios/${id}?motivo=${encodeURIComponent(motivo)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al mover servicio');
      setServicios((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Cargando servicios...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Registrar nuevo servicio</h2>
      <form onSubmit={handleSubmit} style={{ marginBottom: 30 }}>
        <div>
          <label>Tipo de servicio: </label>
          <select name="tipo" value={form.tipo} onChange={handleChange} required>
            <option value="">Selecciona un tipo</option>
            <option value="mantencion de vehiculos electricos">Mantención de vehículos eléctricos</option>
            <option value="mantencion de transpaletas">Mantención de transpaletas</option>
            <option value="cambio de mangueras hidraulicas">Cambio de mangueras hidráulicas</option>
            <option value="reparacion de cilindros hidraulicos">Reparación de cilindros hidráulicos</option>
            <option value="mantencion de motores">Mantención de motores</option>
            <option value="mantencion de gruas a combustion">Mantención de grúas a combustión</option>
            <option value="diagnostico de baterias">Diagnóstico de baterías</option>
            <option value="cambio de neumaticos">Cambio de neumáticos</option>
            <option value="asistencia en terreno">Asistencia en terreno</option>
          </select>
        </div>
        <div>
          <label>Descripción: </label>
          <input name="descripcion" value={form.descripcion} onChange={handleChange} required />
        </div>
        <div>
          <label>Fecha de ingreso: </label>
          <input type="date" name="fechaIngreso" value={form.fechaIngreso} onChange={handleChange} required />
        </div>
        <button type="submit" disabled={enviando} className="btn-primary" style={{ marginTop: 10 }}>
          {enviando ? "Registrando..." : "Registrar servicio"}
        </button>
        {formError && <p style={{ color: "red" }}>{formError}</p>}
      </form>

      <h2>Servicios de Mantención</h2>
      {servicios.length === 0 ? (
        <p>No hay servicios registrados.</p>
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th className="tbl-th">ID</th>
              <th className="tbl-th">Tipo</th>
              <th className="tbl-th">Descripción</th>
              <th className="tbl-th">Estado</th>
              <th className="tbl-th">Fecha Ingreso</th>
              <th className="tbl-th">Fecha Entrega</th>
              <th className="tbl-th">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((s, idx) => (
              <tr key={s.id} className={`tbl-row ${idx % 2 === 0 ? 'even' : 'odd'}`}>
                <td className="tbl-td center">{s.id}</td>
                <td className="tbl-td">{s.tipo}</td>
                <td className="tbl-td">{s.descripcion}</td>
                <td className="tbl-td center">{s.estado}</td>
                <td className="tbl-td center">{s.fechaIngreso}</td>
                <td className="tbl-td center">{s.fechaEntrega || "-"}</td>
                <td className="tbl-td center" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => handleMoveToPaper(s.id, 'terminado')} className="btn-primary small">Terminado</button>
                  <button onClick={() => handleMoveToPaper(s.id, 'cancelado')} className="btn-danger small">Cancelado</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ServiciosList;
