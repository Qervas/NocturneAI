<div class="test-form">
  <div class="form-group">
    <label>Data Input:</label>
    <textarea placeholder="Enter data for pattern analysis..."></textarea>
  </div>
  <div class="form-group">
    <label>Pattern Type:</label>
    <select>
      <option>Sequential Patterns</option>
      <option>Cyclic Patterns</option>
      <option>Anomaly Patterns</option>
      <option>Clustering Patterns</option>
    </select>
  </div>
  <div class="form-group">
    <label>Confidence Threshold:</label>
    <input type="range" min="0" max="100" value="80" />
    <span>80%</span>
  </div>
  <button class="run-test-btn">Run Test</button>
</div>

<h3>Pattern Recognition</h3>
<ul>
  <li><strong>Sequential Patterns:</strong> Identify ordered sequences</li>
  <li><strong>Cyclic Patterns:</strong> Find repeating cycles</li>
  <li><strong>Anomaly Detection:</strong> Spot unusual patterns</li>
  <li><strong>Clustering:</strong> Group similar patterns together</li>
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

  .form-group textarea {
    min-height: 80px;
    resize: vertical;
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