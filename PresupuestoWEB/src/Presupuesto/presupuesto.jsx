import React, { useState, useRef } from 'react';
import { Download, Plus, Trash2, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';
import './presupuesto.css';

const Presupuesto = () => {
  const [companyData, setCompanyData] = useState({
    name: 'xxxxxxx',
    subtitle: 'xxxx xxxx',
    responsibleName: 'xxx xx',
    phone: 'xxxxxxxxx',
    email: 'x@gmail.com'
  });

  const [clientData, setClientData] = useState({
    name: '[Nombre completo o razón social]',
    phone: '[Opcional]',
    email: '[Opcional]',
    projectAddress: ''
  });

  const [budgetData, setBudgetData] = useState({
    rut: '7xxxx xxx-x',
    quotationNumber: 'N° 001-2025',
    issueDate: '[dd/mm/aaaa]',
    validityPeriod: '[Ej: 15 días desde la fecha de emisión]',
    workType: '[Ej: Instalación eléctrica interior/exterior, empalme, reparación, mantención, etc.]'
  });

  const [items, setItems] = useState([
    { id: 1, description: 'Cable eléctrico 3x2.5 mm²', category: 'Materiales', unit: 'mt', quantity: 100, unitPrice: 450, observations: 'Marca Nexans' },
    { id: 2, description: 'Canaleta PVC 40x20 mm', category: 'Materiales', unit: 'mt', quantity: 50, unitPrice: 850, observations: 'Blanca' },
    { id: 3, description: 'Automático bipolar 16A', category: 'Materiales', unit: 'und', quantity: 2, unitPrice: 3500, observations: 'Marca Schneider' },
    { id: 4, description: 'Caja distribución 12 módulos', category: 'Materiales', unit: 'und', quantity: 1, unitPrice: 12000, observations: 'Con riel DIN' },
    { id: 5, description: 'Toma corriente doble empotrado', category: 'Materiales', unit: 'und', quantity: 10, unitPrice: 1200, observations: 'Incluye placa' },
    { id: 6, description: 'Mano de obra: instalación y pruebas', category: 'Mano de Obra', unit: 'glb', quantity: 1, unitPrice: 90000, observations: 'Incluye pruebas y puesta en marcha' }
  ]);

  const [notes, setNotes] = useState([
    'Este presupuesto incluye materiales y mano de obra',
    'Los precios incluyen IVA (19%)',
    'Validez del presupuesto: 15 días corridos'
  ]);

  // Logo state
  const [logo, setLogo] = useState(null);
  const fileInputRef = useRef(null);

  // Calculations
  const calculateSubtotal = (quantity, unitPrice) => quantity * unitPrice;
  const calculateTotal = () => items.reduce((sum, item) => sum + calculateSubtotal(item.quantity, item.unitPrice), 0);
  const calculateIVA = () => calculateTotal() * 0.19;
  const calculateNetTotal = () => calculateTotal() - calculateIVA();

  // Handlers
  const handleFieldEdit = (field, section, value) => {
    const updater = prev => ({ ...prev, [field]: value });
    if (section === 'company') setCompanyData(updater);
    else if (section === 'client') setClientData(updater);
    else if (section === 'budget') setBudgetData(updater);
  };

  const handleItemEdit = (id, field, value) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === 'quantity' || field === 'unitPrice'
                  ? Number(value) || 0
                  : value
            }
          : item
      )
    );
  };

  const addItem = () => {
    const newId = items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : 1;
    setItems(prev => [
      ...prev,
      {
        id: newId,
        description: 'Nueva descripción',
        category: 'Materiales',
        unit: 'und',
        quantity: 1,
        unitPrice: 0,
        observations: ''
      }
    ]);
  };

  const removeItem = id => setItems(prev => prev.filter(item => item.id !== id));

  const addNote = () => setNotes(prev => [...prev, 'Nueva nota']);

  const removeNote = index => setNotes(prev => prev.filter((_, i) => i !== index));

  const handleNoteEdit = (index, value) => {
    setNotes(prev => prev.map((note, i) => (i === index ? value : note)));
  };

  // Logo handlers
  const handleLogoChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleLogoClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // PDF Export
  const exportToPDF = () => window.print();

  // Editable field component
  const EditableField = React.memo(function EditableField({
    value,
    onSave,
    multiline = false,
    className = ''
  }) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    const handleSave = () => {
      onSave(tempValue);
      setIsEditing(false);
    };

    const handleCancel = () => {
      setTempValue(value);
      setIsEditing(false);
    };

    React.useEffect(() => {
      setTempValue(value);
    }, [value]);

    if (isEditing) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {multiline ? (
            <textarea
              value={tempValue}
              onChange={e => setTempValue(e.target.value)}
              className={`editable-textarea ${className}`}
              rows={2}
            />
          ) : (
            <input
              type="text"
              value={tempValue}
              onChange={e => setTempValue(e.target.value)}
              className={`editable-input ${className}`}
            />
          )}
          <button onClick={handleSave} className="save-btn" type="button">
            <Save size={16} />
          </button>
          <button onClick={handleCancel} className="cancel-btn" type="button">
            <X size={16} />
          </button>
        </div>
      );
    }

    return (
      <span className={`editable-field ${className}`}>
        <span>{value}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="edit-btn"
          type="button"
        >
          <Edit2 size={14} />
        </button>
      </span>
    );
  });

  return (
    <div>
      <div className="container">
        {/* Header with Export Button */}
        <header className="header">
          <h1>Generador de Presupuestos</h1>
          <button onClick={exportToPDF} className="export-btn" type="button">
            <Download size={20} />
            <span>Exportar PDF</span>
          </button>
        </header>

        {/* Hidden file input for logo */}
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleLogoChange}
        />

        {/* Budget Document */}
        <main className="budget-document">
          {/* Header */}
          <section className="document-header">
            <div className="company-logo">
              <div
                className="logo"
                style={{
                  height: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                title="Cambiar logo"
                onClick={handleLogoClick}
              >
                {logo ? (
                  <img
                    src={logo}
                    alt="Logo empresa"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <span style={{ fontWeight: 'bold', fontSize: 30 }}>MM</span>
                )}
                <button
                  type="button"
                  className="change-logo-btn no-print"
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    background: 'rgba(255,255,255,0.7)',
                    border: 'none',
                    borderRadius: 4,
                    padding: 2,
                    cursor: 'pointer'
                  }}
                  tabIndex={-1}
                  onClick={e => {
                    e.stopPropagation();
                    handleLogoClick();
                  }}
                  aria-label="Cambiar logo"
                >
                  <ImageIcon size={16} />
                </button>
              </div>
              <div className="company-info">
                <h2>
                  <EditableField
                    value={companyData.name}
                    onSave={value => handleFieldEdit('name', 'company', value)}
                  />
                </h2>
                <div>
                  <EditableField
                    value={companyData.subtitle}
                    onSave={value => handleFieldEdit('subtitle', 'company', value)}
                  />
                </div>
              </div>
            </div>
            <div className="rut-section">
              <div className="rut">
                <EditableField
                  value={budgetData.rut}
                  onSave={value => handleFieldEdit('rut', 'budget', value)}
                />
              </div>
              <div className="quotation-box">
                <EditableField
                  value={budgetData.quotationNumber}
                  onSave={value => handleFieldEdit('quotationNumber', 'budget', value)}
                />
              </div>
            </div>
          </section>

          {/* Three Column Section */}
          <section className="three-columns">
            {/* Company Data */}
            <div className="column">
              <div className="column-header">Datos del Cotizante / Empresa</div>
              <div className="column-content">
                <div className="field">
                  <strong>Empresa: </strong>
                  <EditableField
                    value={companyData.name}
                    onSave={value => handleFieldEdit('name', 'company', value)}
                    className="inline"
                  />
                </div>
                <div className="field">
                  <strong>Nombre del responsable: </strong>
                  <EditableField
                    value={companyData.responsibleName}
                    onSave={value => handleFieldEdit('responsibleName', 'company', value)}
                    className="inline"
                  />
                </div>
                <div className="field">
                  <strong>Teléfono: </strong>
                  <EditableField
                    value={companyData.phone}
                    onSave={value => handleFieldEdit('phone', 'company', value)}
                    className="inline"
                  />
                </div>
                <div className="field">
                  <strong>Correo electrónico: </strong>
                  <EditableField
                    value={companyData.email}
                    onSave={value => handleFieldEdit('email', 'company', value)}
                    className="inline"
                  />
                </div>
              </div>
            </div>

            {/* Client Data */}
            <div className="column">
              <div className="column-header">Datos del Cliente</div>
              <div className="column-content">
                <div className="field">
                  <strong>Nombre del cliente: </strong>
                  <EditableField
                    value={clientData.name}
                    onSave={value => handleFieldEdit('name', 'client', value)}
                    className="inline"
                  />
                </div>
                <div className="field">
                  <strong>Teléfono: </strong>
                  <EditableField
                    value={clientData.phone}
                    onSave={value => handleFieldEdit('phone', 'client', value)}
                    className="inline"
                  />
                </div>
                <div className="field">
                  <strong>Correo electrónico: </strong>
                  <EditableField
                    value={clientData.email}
                    onSave={value => handleFieldEdit('email', 'client', value)}
                    className="inline"
                  />
                </div>
                <div className="field">
                  <strong>Dirección del proyecto: </strong>
                  <EditableField
                    value={clientData.projectAddress}
                    onSave={value => handleFieldEdit('projectAddress', 'client', value)}
                    className="inline"
                  />
                </div>
              </div>
            </div>

            {/* Budget Data */}
            <div className="column">
              <div className="column-header">Datos del Presupuesto</div>
              <div className="column-content">
                <div className="field">
                  <strong>Fecha de emisión: </strong>
                  <EditableField
                    value={budgetData.issueDate}
                    onSave={value => handleFieldEdit('issueDate', 'budget', value)}
                    className="inline"
                  />
                </div>
                <div className="field">
                  <strong>Validez del presupuesto: </strong>
                  <EditableField
                    value={budgetData.validityPeriod}
                    onSave={value => handleFieldEdit('validityPeriod', 'budget', value)}
                    className="inline"
                  />
                </div>
                <div className="field">
                  <strong>Tipo de trabajo: </strong>
                  <EditableField
                    value={budgetData.workType}
                    onSave={value => handleFieldEdit('workType', 'budget', value)}
                    className="inline"
                    multiline
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Items Table */}
          <section>
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>Ítem</th>
                  <th>Descripción</th>
                  <th style={{ width: '80px' }}>Categoría</th>
                  <th style={{ width: '64px' }}>Unidad</th>
                  <th style={{ width: '64px' }}>Cantidad</th>
                  <th style={{ width: '80px' }}>P. Unitario ($)</th>
                  <th style={{ width: '80px' }}>Subtotal ($)</th>
                  <th>Observaciones</th>
                  <th className="actions-column" style={{ width: '64px' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="text-center">{index + 1}</td>
                    <td>
                      <EditableField
                        value={item.description}
                        onSave={value => handleItemEdit(item.id, 'description', value)}
                        className="w-full"
                      />
                    </td>
                    <td>
                      <select
                        value={item.category}
                        onChange={e =>
                          handleItemEdit(item.id, 'category', e.target.value)
                        }
                        className="category-select"
                      >
                        <option value="Materiales">Materiales</option>
                        <option value="Mano de Obra">Mano de Obra</option>
                        <option value="Herramientas">Herramientas</option>
                        <option value="Transporte">Transporte</option>
                      </select>
                    </td>
                    <td>
                      <EditableField
                        value={item.unit}
                        onSave={value => handleItemEdit(item.id, 'unit', value)}
                        className="w-full"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e =>
                          handleItemEdit(item.id, 'quantity', e.target.value)
                        }
                        className="table-input number-input"
                        min={0}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={e =>
                          handleItemEdit(item.id, 'unitPrice', e.target.value)
                        }
                        className="table-input price-input"
                        min={0}
                      />
                    </td>
                    <td className="subtotal">
                      {calculateSubtotal(item.quantity, item.unitPrice).toLocaleString()}
                    </td>
                    <td>
                      <EditableField
                        value={item.observations}
                        onSave={value => handleItemEdit(item.id, 'observations', value)}
                        className="w-full"
                      />
                    </td>
                    <td className="text-center actions-column">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="delete-btn"
                        type="button"
                        aria-label="Eliminar ítem"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={addItem} className="add-item-btn" type="button">
              <Plus size={16} />
              <span>Agregar ítem</span>
            </button>
          </section>

          {/* Totals */}
          <section className="totals-section">
            <div className="totals">
              <div className="total-row">
                <span>SUBTOTAL NETO</span>
                <span className="font-semibold">{calculateNetTotal().toLocaleString()}</span>
              </div>
              <div className="total-row">
                <span>IVA 19%</span>
                <span className="font-semibold">{calculateIVA().toLocaleString()}</span>
              </div>
              <div className="total-row final">
                <span>TOTAL</span>
                <span>{calculateTotal().toLocaleString()}</span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="notes-section">
            <div className="notes-header">
              <strong>Notas/Condiciones:</strong>
              <button onClick={addNote} className="add-note-btn" type="button">
                <Plus size={14} />
              </button>
            </div>
            <ul className="notes-list">
              {notes.map((note, index) => (
                <li key={index} className="note-item">
                  <span>-</span>
                  <div className="note-content">
                    <EditableField
                      value={note}
                      onSave={value => handleNoteEdit(index, value)}
                      className="w-full"
                    />
                    <button
                      onClick={() => removeNote(index)}
                      className="delete-btn"
                      type="button"
                      aria-label="Eliminar nota"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Presupuesto;