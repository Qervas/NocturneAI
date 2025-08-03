<div class="test-form">
  <div class="form-group">
    <label>Path:</label>
    <input type="text" placeholder="/path/to/directory" />
  </div>
  <div class="form-group">
    <label>Operation:</label>
    <select>
      <option>List Contents</option>
      <option>Create Directory</option>
      <option>Delete Directory</option>
      <option>Search Files</option>
    </select>
  </div>
  <div class="form-group">
    <label>Recursive:</label>
    <input type="checkbox" />
  </div>
  <button class="run-test-btn">Execute</button>
</div>

<style>
  .test-form {
    background: #F8F9FA;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    border: 1px solid #E9ECEF;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #2C3E50;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #BDC3C7;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
  }

  .run-test-btn {
    background: linear-gradient(135deg, #3498DB, #2980B9);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .run-test-btn:hover {
    background: linear-gradient(135deg, #2980B9, #1F618D);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
</style> 