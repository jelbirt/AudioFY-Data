package planeCrashes;

import javax.swing.JPanel;
import javax.swing.JTabbedPane;
import javax.swing.JTextField;

import java.awt.GridBagLayout;

import javax.swing.DefaultComboBoxModel;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import java.awt.GridBagConstraints;
import java.awt.Font;
import java.awt.Insets;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class graphConfigsTab extends JPanel implements ActionListener {
	private JTabbedPane tabbedPane = null;
	private Configurations CONFIG = null;
	private JTextField graphTitleTxt;
	private JTextField xAxisTitleTxt;
	private JTextField yAxisTitleTxt;
	private JComboBox dataFormatComboBox;
	private JTextField yMinValueTxt;
	private JTextField yMaxValueTxt;
	private JCheckBox yAxisTicksCheckBox;
	private JTextField yTickIntervalTxt;
	private JButton updateGraphBtn;
	private JFrame PW = null;
	
	public graphConfigsTab(JFrame parentWindow, JTabbedPane tp, Configurations config) {
		super();
		tabbedPane = tp;
		CONFIG = config;
		PW = parentWindow;
		// Graph Configuration Tab
				 // TODO : add Listeners 
				 JPanel graphConfPanel = new JPanel();
				    tabbedPane.add("Graph Configurations",graphConfPanel);
				    GridBagLayout gbl_graphConfPanel = new GridBagLayout();
				    gbl_graphConfPanel.columnWidths = new int[]{0, 0, 0, 0, 0, 0, 0, 0};
				    gbl_graphConfPanel.rowHeights = new int[]{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
				    gbl_graphConfPanel.columnWeights = new double[]{0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, Double.MIN_VALUE};
				    gbl_graphConfPanel.rowWeights = new double[]{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, Double.MIN_VALUE};
				    graphConfPanel.setLayout(gbl_graphConfPanel);
				    
				    JLabel graphTitlesPanelHeader = new JLabel("Graph Titles");
				    graphTitlesPanelHeader.setFont(new Font("Tahoma", Font.BOLD, 11));
				    GridBagConstraints gbc_graphTitlesLbl = new GridBagConstraints();
				    gbc_graphTitlesLbl.insets = new Insets(5, 0, 5, 5);
				    gbc_graphTitlesLbl.gridx = 3;
				    gbc_graphTitlesLbl.gridy = 0;
				    graphConfPanel.add(graphTitlesPanelHeader, gbc_graphTitlesLbl);
				    
				    JPanel graphTitlesPanel = new JPanel();
				    GridBagConstraints gbc_graphTitlesPanel = new GridBagConstraints();
				    gbc_graphTitlesPanel.gridwidth = 3;
				    gbc_graphTitlesPanel.insets = new Insets(0, 0, 5, 5);
				    gbc_graphTitlesPanel.fill = GridBagConstraints.BOTH;
				    gbc_graphTitlesPanel.gridx = 2;
				    gbc_graphTitlesPanel.gridy = 1;
				    graphConfPanel.add(graphTitlesPanel, gbc_graphTitlesPanel);
				    GridBagLayout gbl_graphTitlesPanel = new GridBagLayout();
				    gbl_graphTitlesPanel.columnWidths = new int[]{0, 0, 0, 0, 0};
				    gbl_graphTitlesPanel.rowHeights = new int[]{0, 0, 0};
				    gbl_graphTitlesPanel.columnWeights = new double[]{0.0, 1.0, 0.0, 1.0, Double.MIN_VALUE};
				    gbl_graphTitlesPanel.rowWeights = new double[]{0.0, 0.0, Double.MIN_VALUE};
				    graphTitlesPanel.setLayout(gbl_graphTitlesPanel);
				    
				    JLabel graphTitleLbl = new JLabel("Graph Title");
				    GridBagConstraints gbc_graphTitleLbl = new GridBagConstraints();
				    gbc_graphTitleLbl.insets = new Insets(0, 5, 5, 5);
				    gbc_graphTitleLbl.gridx = 0;
				    gbc_graphTitleLbl.gridy = 0;
				    graphTitlesPanel.add(graphTitleLbl, gbc_graphTitleLbl);
				    
				    graphTitleTxt = new JTextField();
				    graphTitleTxt.setColumns(52);
				    GridBagConstraints gbc_graphTitleTxt = new GridBagConstraints();
				    gbc_graphTitleTxt.fill = GridBagConstraints.HORIZONTAL;
				    gbc_graphTitleTxt.gridwidth = 3;
				    gbc_graphTitleTxt.insets = new Insets(5, 0, 5, 5);
				    gbc_graphTitleTxt.gridx = 1;
				    gbc_graphTitleTxt.gridy = 0;
				    graphTitlesPanel.add(graphTitleTxt, gbc_graphTitleTxt);
				    
				    JLabel xAxisTitleLbl = new JLabel("X-Axis Title");
				    GridBagConstraints gbc_xAxisTitleLbl = new GridBagConstraints();
				    gbc_xAxisTitleLbl.insets = new Insets(0, 5, 0, 5);
				    gbc_xAxisTitleLbl.gridx = 0;
				    gbc_xAxisTitleLbl.gridy = 1;
				    graphTitlesPanel.add(xAxisTitleLbl, gbc_xAxisTitleLbl);
				    
				    xAxisTitleTxt = new JTextField();
				    xAxisTitleTxt.setColumns(10);
				    GridBagConstraints gbc_xAxisTitleTxt = new GridBagConstraints();
				    gbc_xAxisTitleTxt.fill = GridBagConstraints.HORIZONTAL;
				    gbc_xAxisTitleTxt.insets = new Insets(0, 0, 5, 5);
				    gbc_xAxisTitleTxt.gridx = 1;
				    gbc_xAxisTitleTxt.gridy = 1;
				    graphTitlesPanel.add(xAxisTitleTxt, gbc_xAxisTitleTxt);
				    
				    JLabel yAxisTitleLbl = new JLabel("Y-Axis Title");
				    GridBagConstraints gbc_yAxisTitleLbl = new GridBagConstraints();
				    gbc_yAxisTitleLbl.insets = new Insets(0, 5, 0, 5);
				    gbc_yAxisTitleLbl.gridx = 2;
				    gbc_yAxisTitleLbl.gridy = 1;
				    graphTitlesPanel.add(yAxisTitleLbl, gbc_yAxisTitleLbl);
				    
				    yAxisTitleTxt = new JTextField();
				    yAxisTitleTxt.setColumns(22);
				    GridBagConstraints gbc_yAxisTitleTxt = new GridBagConstraints();
				    gbc_yAxisTitleTxt.insets = new Insets(0, 0, 5, 5);
				    gbc_yAxisTitleTxt.fill = GridBagConstraints.HORIZONTAL;
				    gbc_yAxisTitleTxt.gridx = 3;
				    gbc_yAxisTitleTxt.gridy = 1;
				    graphTitlesPanel.add(yAxisTitleTxt, gbc_yAxisTitleTxt);
				    
				    JLabel yAxisDataHeader = new JLabel("Y-Axis Data / Settings");
				    yAxisDataHeader.setFont(new Font("Tahoma", Font.BOLD, 11));
				    GridBagConstraints gbc_yAxisDataHeader = new GridBagConstraints();
				    gbc_yAxisDataHeader.insets = new Insets(5, 0, 5, 5);
				    gbc_yAxisDataHeader.gridx = 3;
				    gbc_yAxisDataHeader.gridy = 3;
				    graphConfPanel.add(yAxisDataHeader, gbc_yAxisDataHeader);
				    
				    JPanel yAxisDataHeaderPanel = new JPanel();
				    GridBagConstraints gbc_yAxisDataHeaderPanel = new GridBagConstraints();
				    gbc_yAxisDataHeaderPanel.anchor = GridBagConstraints.NORTH;
				    gbc_yAxisDataHeaderPanel.gridwidth = 3;
				    gbc_yAxisDataHeaderPanel.insets = new Insets(5, 0, 5, 5);
				    gbc_yAxisDataHeaderPanel.fill = GridBagConstraints.BOTH;
				    gbc_yAxisDataHeaderPanel.gridx = 2;
				    gbc_yAxisDataHeaderPanel.gridy = 4;
				    graphConfPanel.add(yAxisDataHeaderPanel, gbc_yAxisDataHeaderPanel);
				    GridBagLayout gbl_yAxisDataHeaderPanel = new GridBagLayout();
				    gbl_yAxisDataHeaderPanel.columnWidths = new int[]{0, 0, 0, 0, 0, 0, 0};
				    gbl_yAxisDataHeaderPanel.rowHeights = new int[]{0, 0, 0, 0};
				    gbl_yAxisDataHeaderPanel.columnWeights = new double[]{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, Double.MIN_VALUE};
				    gbl_yAxisDataHeaderPanel.rowWeights = new double[]{0.0, 0.0, 0.0, Double.MIN_VALUE};
				    yAxisDataHeaderPanel.setLayout(gbl_yAxisDataHeaderPanel);
				    
				    JLabel dataFormatLbl = new JLabel("Data Format to Plot");
				    GridBagConstraints gbc_dataFormatLbl = new GridBagConstraints();
				    gbc_dataFormatLbl.insets = new Insets(0, 5, 5, 5);
				    gbc_dataFormatLbl.gridx = 1;
				    gbc_dataFormatLbl.gridy = 0;
				    yAxisDataHeaderPanel.add(dataFormatLbl, gbc_dataFormatLbl);
				    // TODO : ask ben
				    dataFormatComboBox = new JComboBox();
				    dataFormatComboBox.setModel(new DefaultComboBoxModel(new String[] {" Raw Data Value", " Normalized Value", " Log Trans. Value", " Hz Value (frequency)"}));
				    dataFormatComboBox.setSelectedIndex(3);
				    dataFormatComboBox.setMaximumRowCount(5);
				    GridBagConstraints gbc_dataFormatComboBox = new GridBagConstraints();
				    gbc_dataFormatComboBox.gridwidth = 3;
				    gbc_dataFormatComboBox.insets = new Insets(5, 5, 5, 5);
				    gbc_dataFormatComboBox.fill = GridBagConstraints.HORIZONTAL;
				    gbc_dataFormatComboBox.gridx = 2;
				    gbc_dataFormatComboBox.gridy = 0;
				    yAxisDataHeaderPanel.add(dataFormatComboBox, gbc_dataFormatComboBox);
				    
				    JLabel yMinValueLbl = new JLabel("Minimum Value (origin)");
				    GridBagConstraints gbc_yMinValueLbl = new GridBagConstraints();
				    gbc_yMinValueLbl.anchor = GridBagConstraints.WEST;
				    gbc_yMinValueLbl.insets = new Insets(10, 5, 5, 5);
				    gbc_yMinValueLbl.gridx = 1;
				    gbc_yMinValueLbl.gridy = 1;
				    yAxisDataHeaderPanel.add(yMinValueLbl, gbc_yMinValueLbl);
				    
				    yMinValueTxt = new JTextField();
				    yMinValueTxt.setText("0.0");
				    GridBagConstraints gbc_yMinValueTxt = new GridBagConstraints();
				    gbc_yMinValueTxt.fill = GridBagConstraints.HORIZONTAL;
				    gbc_yMinValueTxt.insets = new Insets(10, 5, 5, 5);
				    gbc_yMinValueTxt.gridx = 2;
				    gbc_yMinValueTxt.gridy = 1;
				    yAxisDataHeaderPanel.add(yMinValueTxt, gbc_yMinValueTxt);
				    yMinValueTxt.setColumns(5);
				    
				    JLabel yMaxValueLbl = new JLabel("Maximum Value");
				    GridBagConstraints gbc_yMaxValueLbl = new GridBagConstraints();
				    gbc_yMaxValueLbl.anchor = GridBagConstraints.EAST;
				    gbc_yMaxValueLbl.insets = new Insets(10, 5, 5, 5);
				    gbc_yMaxValueLbl.gridx = 4;
				    gbc_yMaxValueLbl.gridy = 1;
				    yAxisDataHeaderPanel.add(yMaxValueLbl, gbc_yMaxValueLbl);
				    
				    yMaxValueTxt = new JTextField();
				    yMaxValueTxt.setText("2000.0");
				    GridBagConstraints gbc_yMaxValueTxt = new GridBagConstraints();
				    gbc_yMaxValueTxt.fill = GridBagConstraints.HORIZONTAL;
				    gbc_yMaxValueTxt.insets = new Insets(10, 5, 5, 0);
				    gbc_yMaxValueTxt.gridx = 5;
				    gbc_yMaxValueTxt.gridy = 1;
				    yAxisDataHeaderPanel.add(yMaxValueTxt, gbc_yMaxValueTxt);
				    yMaxValueTxt.setColumns(5);
				    
				    yAxisTicksCheckBox = new JCheckBox("   Axis Tick Lines");
				    GridBagConstraints gbc_yAxisTicksCheckBox = new GridBagConstraints();
				    gbc_yAxisTicksCheckBox.insets = new Insets(10, 0, 5, 5);
				    gbc_yAxisTicksCheckBox.gridx = 1;
				    gbc_yAxisTicksCheckBox.gridy = 2;
				    yAxisDataHeaderPanel.add(yAxisTicksCheckBox, gbc_yAxisTicksCheckBox);
				    
				    JLabel yTickIntervalLbl = new JLabel("Tick Interval");
				    GridBagConstraints gbc_yTickIntervalLbl = new GridBagConstraints();
				    gbc_yTickIntervalLbl.anchor = GridBagConstraints.EAST;
				    gbc_yTickIntervalLbl.gridwidth = 2;
				    gbc_yTickIntervalLbl.insets = new Insets(10, 0, 5, 5);
				    gbc_yTickIntervalLbl.gridx = 2;
				    gbc_yTickIntervalLbl.gridy = 2;
				    yAxisDataHeaderPanel.add(yTickIntervalLbl, gbc_yTickIntervalLbl);
				    // TODO : Set these two invisible (or unavailable) unless Axis Tick CheckboX is checked
				    yTickIntervalTxt = new JTextField();
				    yTickIntervalTxt.setText("0.0");
				    GridBagConstraints gbc_yTickIntervalTxt = new GridBagConstraints();
				    gbc_yTickIntervalTxt.anchor = GridBagConstraints.WEST;
				    gbc_yTickIntervalTxt.insets = new Insets(10, 5, 5, 5);
				    gbc_yTickIntervalTxt.gridx = 4;
				    gbc_yTickIntervalTxt.gridy = 2;
				    yAxisDataHeaderPanel.add(yTickIntervalTxt, gbc_yTickIntervalTxt);
				    yTickIntervalTxt.setColumns(5);
				    
				    updateGraphBtn = new JButton("Update Graph");
				    GridBagConstraints gbc_updateGraphBtn = new GridBagConstraints();
				    gbc_updateGraphBtn.gridwidth = 3;
				    gbc_updateGraphBtn.insets = new Insets(0, 0, 0, 5);
				    gbc_updateGraphBtn.gridx = 5;
				    gbc_updateGraphBtn.gridy = 9;
				    graphConfPanel.add(updateGraphBtn, gbc_updateGraphBtn);
				    updateGraphBtn.setActionCommand("Update Graph");
				    updateGraphBtn.addActionListener(this);
		
	}

	public void actionPerformed(ActionEvent e) {
		if (e.getActionCommand().equals("Update Graph")) {
			// TODO :
		}
	}
	
	

    /*tabbedPane.add("Graph Configurations",graphConfPanel);
    GridBagLayout gbl_graphConfPanel = new GridBagLayout();
    gbl_graphConfPanel.columnWidths = new int[]{0};
    gbl_graphConfPanel.rowHeights = new int[]{0};
    gbl_graphConfPanel.columnWeights = new double[]{Double.MIN_VALUE};
    gbl_graphConfPanel.rowWeights = new double[]{Double.MIN_VALUE};
    graphConfPanel.setLayout(gbl_graphConfPanel);*/

}
