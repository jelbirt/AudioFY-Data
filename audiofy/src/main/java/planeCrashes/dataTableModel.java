/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*/

package planeCrashes;

import java.text.DecimalFormat;
import javax.swing.table.AbstractTableModel;

public class dataTableModel extends AbstractTableModel {
	private static final long serialVersionUID = 1L;
	private String[] columnNames = new String[] {};
	private Object[][] data = new Object[][] {};
	private int DecimalPrecision = 4;
	
	public dataTableModel() {
	}
	
	public dataTableModel(String[] column_names) {
		setColumnNames(column_names);
	}

	public dataTableModel(String[] column_names, Object[][] display_data) {
		setColumnNames(column_names);
		setData(display_data);
	}

	public dataTableModel(Object[][] display_data) {
		setData(display_data);
	}
	
	public int getDecimalPrecision() {
		return DecimalPrecision;
	}

	public void setDecimalPrecision(int precision) {
		DecimalPrecision = precision;
	}

	public String[] getColumnNames() {
		return columnNames;
	}

	public void setColumnNames(String[] columnNames) {
		this.columnNames = columnNames;
	}
	
	public int getColorIndex(String name) {
		for(int i=0;i<data.length;i++) {
			if(((String)data[i][0]).equals(name)) {
				return i;
			}
		}
		return -1;
	}

	public Object[][] getData() {
		return data;
	}

	public void setData(Object[][] data) {
		this.data = data;
	}

	public int getRowCount() {
		return data.length;
	}

	public int getColumnCount() {
		return data[0].length;
	}

	@Override public void setValueAt(Object value, int rowIndex, int columnIndex) {
		data[rowIndex][columnIndex] = value;
	}
	
	public Object getValueAt(int rowIndex, int columnIndex) {
		DecimalFormat df = new DecimalFormat("#0");
        df.setMaximumFractionDigits(DecimalPrecision);
		
        if(columnIndex >= 2 && data[rowIndex][columnIndex] instanceof Double) {
        	return df.format(((Double)data[rowIndex][columnIndex]));
        }
        
		return data[rowIndex][columnIndex];
	}

	@Override public String getColumnName(int columnIndex) {
		return columnNames[columnIndex];
	}
	
	@Override public boolean isCellEditable(int row, int col) {
		return false;
	}
}
