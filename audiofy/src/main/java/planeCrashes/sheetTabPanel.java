package planeCrashes;

import javax.swing.JPanel;
import java.awt.GridBagLayout;
import javax.swing.JLabel;
import javax.swing.JList;
import java.awt.GridBagConstraints;
import javax.swing.JRadioButton;
import javax.swing.event.ChangeEvent;
import javax.swing.event.ChangeListener;
import javax.swing.event.ListSelectionEvent;
import javax.swing.event.ListSelectionListener;
import java.awt.Insets;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.List;
import java.util.zip.DataFormatException;
import javax.swing.ButtonGroup;
import javax.swing.DefaultListModel;
import javax.swing.JScrollPane;
import javax.swing.JButton;

public class sheetTabPanel extends JPanel implements ChangeListener, ActionListener, ListSelectionListener {

	private JRadioButton rowHeader;
	private JRadioButton ColumnHeader;
	private static final long serialVersionUID = 1L;
	private AudioFY AF = null;
	private String SHEET_NAME = "";
	private boolean lastHeaderStatusRow = true;
	private boolean guiSetup = true;
	private JList<String> dataHeader;
	private JScrollPane scrollPane;
	private JButton btnNewButton;
	private int sheetWBIndex = 0;
	private Hashtable<String,Integer> headerWBIDs = new Hashtable<String,Integer>();
	private Hashtable<String,double[]> headerStats = new Hashtable<String,double[]>();  // min, max, count, sum, sum sqr
	
	public sheetTabPanel(AudioFY mainWindow, String sheetName, int sheetIndex) {
		AF = mainWindow;
		setSheetWBIndex(sheetIndex);
		setSheetName(sheetName);
		
		GridBagLayout gridBagLayout = new GridBagLayout();
		gridBagLayout.columnWidths = new int[]{0, 0, 0, 0};
		gridBagLayout.rowHeights = new int[]{0, 0, 0, 0, 0};
		gridBagLayout.columnWeights = new double[]{0.0, 0.0, 0.0, Double.MIN_VALUE};
		gridBagLayout.rowWeights = new double[]{0.0, 0.0, 0.0, 0.0, Double.MIN_VALUE};
		setLayout(gridBagLayout);
		
		/* 		The following code is for row vs. column header GUI Radio button 
		 * 
		 *
		JLabel lblNewLabel = new JLabel("Header");
		GridBagConstraints gbc_lblNewLabel = new GridBagConstraints();
		gbc_lblNewLabel.insets = new Insets(5, 5, 5, 5);
		gbc_lblNewLabel.gridx = 0;
		gbc_lblNewLabel.gridy = 0;
		add(lblNewLabel, gbc_lblNewLabel);
		
		ColumnHeader = new JRadioButton("Column");
		ColumnHeader.addChangeListener(this);
		GridBagConstraints gbc_ColumnHeader = new GridBagConstraints();
		gbc_ColumnHeader.insets = new Insets(5, 0, 5, 5);
		gbc_ColumnHeader.gridx = 1;
		gbc_ColumnHeader.gridy = 0;
		add(ColumnHeader, gbc_ColumnHeader);
		
		rowHeader = new JRadioButton("Row");
		rowHeader.setSelected(true);
		rowHeader.addChangeListener(this);
		GridBagConstraints gbc_rowHeader = new GridBagConstraints();
		gbc_rowHeader.anchor = GridBagConstraints.WEST;
		gbc_rowHeader.insets = new Insets(5, 0, 5, 0);
		gbc_rowHeader.gridx = 2;
		gbc_rowHeader.gridy = 0;
		add(rowHeader, gbc_rowHeader);
		
		ButtonGroup RorC = new ButtonGroup();
		RorC.add(ColumnHeader);
		RorC.add(rowHeader);
		*/
		
		JLabel lblNewLabel_1 = new JLabel("Data Headers");
		GridBagConstraints gbc_lblNewLabel_1 = new GridBagConstraints();
		gbc_lblNewLabel_1.insets = new Insets(0, 0, 5, 0);
		gbc_lblNewLabel_1.gridwidth = 3;
		gbc_lblNewLabel_1.gridx = 0;
		gbc_lblNewLabel_1.gridy = 1;
		add(lblNewLabel_1, gbc_lblNewLabel_1);	
		
		scrollPane = new JScrollPane();
		GridBagConstraints gbc_scrollPane = new GridBagConstraints();
		gbc_scrollPane.insets = new Insets(5, 0, 5, 0);
		gbc_scrollPane.fill = GridBagConstraints.BOTH;
		gbc_scrollPane.gridwidth = 3;
		gbc_scrollPane.gridx = 0;
		gbc_scrollPane.gridy = 2;
		add(scrollPane, gbc_scrollPane);
		
		dataHeader = new JList<String>();
		dataHeader.addListSelectionListener(this);
		scrollPane.setViewportView(dataHeader);
		
		btnNewButton = new JButton("Clear Selection");
		GridBagConstraints gbc_btnNewButton = new GridBagConstraints();
		gbc_btnNewButton.gridwidth = 3;
		gbc_btnNewButton.insets = new Insets(0, 0, 0, 5);
		gbc_btnNewButton.gridx = 0;
		gbc_btnNewButton.gridy = 3;
		add(btnNewButton, gbc_btnNewButton);
		btnNewButton.setActionCommand("Clear Selection");
		btnNewButton.addActionListener(this);
		
		
		guiSetup = false;
	}
	
	public ArrayList<dataSourceStructure> getDSSList(dataTableCellColorRenderer DTR, dataTableModel DTM) throws DataFormatException {
		ArrayList<dataSourceStructure> DSS = new ArrayList<dataSourceStructure>();
		if(dataHeader.getSelectedIndices().length > 0) {
			for(int i=0;i<dataHeader.getSelectedIndices().length;i++) {
				String vName = dataHeader.getModel().getElementAt(dataHeader.getSelectedIndices()[i]);
				String fName = SHEET_NAME + "-" + vName;
				double[] stats = getHeaderStats(vName);
				
				dataSourceStructure dss = new dataSourceStructure(
					getSheetWBIndex(), 
					getWBHeaderIndex(vName),
					// getColumnHeader().isSelected(),		<-- code for handling ROW/column headers
					DTR.getBackgroundColor(fName, DTM)
				);
				System.out.println(stats[0] + "\t \t" + stats[1] + "\t \t" + stats[2]);
				dss.setMinValue(stats[0]);
				dss.setMaxValue(stats[1]);
				dss.setMaxDataIndex((int)stats[2]);
				dss.setSheetName(SHEET_NAME);
				dss.setrORcName(vName);
				dss.setSumValue(stats[3]);
				dss.setSumSqValue(stats[4]);
				dss.setStdDev(stats[5]);
				dss.setSqStdDev(stats[6]);
				
				DSS.add(dss);
			}
		}
		
		return DSS;
	}
	
	public void setSheetName(String name) {
		SHEET_NAME = name;
	}

	public void setHeaderStats(Hashtable<String,double[]> stats) {
		headerStats = stats;
	}
	
	// min, max, count, sum, sum sqr, std_dev, sq_std_dev
	public void setHeaderStats(String name, double min, double max, int count, double sum, double sum_sqr, double std_dev, double sq_std_dev) {
		if(count < 0) { throw new NumberFormatException("Invalid setHeaderMinMaxCount (" + count + ") - must be a valid integer >= 0."); }
		headerStats.put(name, new double[] { min, max, (double)count, sum, sum_sqr, std_dev, sq_std_dev } );
	}
	
	public double[] getGlobalMinMaxValues() {
		double[] minmax = new double[] { 0.0, 0.0 };
		
		Enumeration<String> keys = headerStats.keys();
		boolean first = true;
		while(keys.hasMoreElements()) {
			double[] values = headerStats.get(keys.nextElement());
			if(values[0] < minmax[0] || first) {
				minmax[0] = values[0];
			}
			if(values[1] > minmax[1] || first) {
				minmax[1] = values[1];
			}
			first = false;
		}
		
		return minmax;
	}
	
	public double[] getHeaderStats(String name) {
		if(headerStats.containsKey(name)) {
			return headerStats.get(name);
		}
		return null;
	}
	
	public int getWBHeaderIndex(String name) {
		if(headerWBIDs.containsKey(name)) {
			return headerWBIDs.get(name);
		}
		
		return -1;
	}
	
	public void setWBHeaderIndex(String name, int wbIndex) throws DataFormatException {
		if(wbIndex < 0) {
			throw new DataFormatException("Invalid wbIndex (" + wbIndex +") - must be an integer >= 0.");
		}
		if(name.isEmpty()) {
			throw new DataFormatException("Invalid wbIndex name - must be a non-blank value.");
		}
		headerWBIDs.put(name,wbIndex);
	}
	
	public int getSheetWBIndex() {
		return sheetWBIndex;
	}

	public void setSheetWBIndex(int sheetWBIndex) {
		this.sheetWBIndex = sheetWBIndex;
	}

	public String getSheetName() {
		return SHEET_NAME;
	}
	
	public JList<String> getDataHeader() {
		return dataHeader;
	}

	public JRadioButton getRowHeader() {
		return rowHeader;
	}

	public JRadioButton getColumnHeader() {
		return ColumnHeader;
	}

	public void spreadsheetUpdate(boolean row_header, boolean force, ArrayList<String> dataList) {
		if (((row_header && lastHeaderStatusRow) || (!row_header && !lastHeaderStatusRow) ) && !force) {
			return;
		}
		lastHeaderStatusRow = row_header;
		//Collections.sort(dataList);
		DefaultListModel<String> lm = new DefaultListModel<String>();
		for (int i=0; i < dataList.size(); ++i) {
			lm.addElement(dataList.get(i));
		}
		dataHeader.setModel(lm);
	}

	public void setSelected(int[] indexes) {
		dataHeader.setSelectedIndices(indexes);
	}
	
	public List<String> getSelectedVariables() {
		return dataHeader.getSelectedValuesList();
	}
	
	// This method & ChangeListener is only used for Row/Column Header RadioButtons
	public void stateChanged(ChangeEvent e) {
		/*
		if (!guiSetup) {
			try {
				AF.updateSpreadsheetGUI(!rowHeader.isSelected(), false, SHEET_NAME);
				AF.setNeedSave(true);
			} catch(Exception E) {
				AF.displayErrorMSG(E);
				E.printStackTrace();
			}
		}
		*/
	}

	public void actionPerformed(ActionEvent e) {
		if(dataHeader.getSelectedIndices().length > 0) {
			dataHeader.clearSelection();
			AF.setNeedSave(true);
		}
		try {
			AF.updateDPvariables();
		} catch(Exception E) {
			AF.displayErrorMSG(E);
		}
	}

	public void valueChanged(ListSelectionEvent e) {
		try {
			AF.updateDPvariables();
			AF.setNeedSave(true);
		} catch(Exception E) {
			AF.displayErrorMSG(E);
		}
	}
	
}
