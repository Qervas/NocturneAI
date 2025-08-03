<div class="test-form">
  <div class="form-group">
    <label>Data Source:</label>
    <input type="text" placeholder="/path/to/data.csv" />
  </div>
  <div class="form-group">
    <label>Analysis Type:</label>
    <select>
      <option>Statistical Summary</option>
      <option>Trend Analysis</option>
      <option>Correlation Analysis</option>
      <option>Outlier Detection</option>
    </select>
  </div>
  <div class="form-group">
    <label>Output Format:</label>
    <select>
      <option>JSON</option>
      <option>CSV</option>
      <option>Chart</option>
      <option>Report</option>
    </select>
  </div>
  <button class="run-test-btn">Run Test</button>
</div>

<h3>Data Analysis Capabilities</h3>
<ul>
  <li><strong>Statistical Analysis:</strong> Mean, median, standard deviation</li>
  <li><strong>Trend Detection:</strong> Identify patterns over time</li>
  <li><strong>Correlation Analysis:</strong> Find relationships between variables</li>
  <li><strong>Data Visualization:</strong> Generate charts and graphs</li>
</ul>

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
  .form-group select,
  .form-group textarea {
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

  ul {
    margin: 15px 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 8px;
    color: #34495E;
  }
</style> 