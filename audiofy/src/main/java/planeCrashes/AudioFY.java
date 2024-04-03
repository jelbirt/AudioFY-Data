/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*/

package planeCrashes;

import java.awt.Color;
import java.awt.EventQueue;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.WindowEvent;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.Hashtable;
import java.util.List;
import java.util.zip.DataFormatException;
import javax.swing.JFrame;
import javax.swing.JMenuBar;
import javax.swing.JMenu;
import javax.swing.JMenuItem;
import javax.swing.JOptionPane;
import javax.swing.JSeparator;
import java.awt.GridBagLayout;
import javax.swing.JPanel;
import java.awt.GridBagConstraints;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.SwingConstants;
import javax.swing.event.ChangeEvent;
import javax.swing.event.ChangeListener;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFCell;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.awt.Insets;
import java.awt.Window.Type;
import javax.swing.JTextField;
import javax.swing.ListModel;
import javax.swing.JTabbedPane;
import javax.swing.JSlider;
import java.awt.Font;
import java.awt.Graphics;

import javax.sound.sampled.AudioFileFormat;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.SourceDataLine;
import javax.sound.sampled.TargetDataLine;
import javax.swing.BorderFactory;
import javax.swing.ButtonGroup;
import javax.swing.JCheckBox;
import javax.swing.JFileChooser;
import javax.swing.JRadioButton;
import javax.swing.JScrollPane;
import javax.swing.JComboBox;
import javax.swing.DefaultComboBoxModel;
import javax.swing.JButton;

	/* Set of unresolved known issues, as well as future areas/features to be developed
	* FUTURE AREAS FOR DEVELOPMENT:
	*
	* Graph panel size/axis scaling
	* Error Handling (Batch vs Event) Functionality/Restrategize and Refactor
	* TODO : TD, Excel, AudioMP3 Outputs
	* TODO : Test Input File actionListener event
	* TODO : Config option to select the graphed value (raw vs normalized vs log vs hz)
	* TODO : Update graph/axis titles
	* TODO : Graph Panel negative values.
	
	* NEW TODOS
	* TODO : IDEA for graph panel: slightly larger JPanel, create/embed horizontal scrollbar above or below actual graph, set visible to false until
	*		  a "notesPlayed" counter reaches the width of the X-Axis and then set it to become visible
	* TODO : Data Panel can only be moved around screen if clicking/dragging on the white data column rows - nowhere else on screen
	* TODO : Video file with audio + graph as it plays
	* TODO : reset button on play panel?
	*/

public class AudioFY implements ActionListener, ChangeListener, KeyListener {
	private String version = "1.0";
	private boolean GUI_SETUP = false;
	private boolean needSave = false;
	private int MAX_FREQ = 2000;
	private int MIN_FREQ = 200;
	private int MIN_TONE_LENGTH = 50;
	private int MAX_TONE_LENGTH = 1000;
	private int DEFAULT_TONE_LENGTH = 150;
	private int BORDER_SIZE = 3;
	private JFrame PW_FRAME;
	private JFrame DP_FRAME;
	private dataPanel DP;
	private playPanel PP;
	private JFrame frmAudiofyData;
	private JTextField guiInputFile;
	protected JTextField guiOutputFile;
	private JTextField guiMinFreqTxtVal;
	private JTextField guiMaxFreqTxtVal;
	private JSlider guiMinFreq;
	private JSlider guiMaxFreq;
	private String sNorm = "";
	private JRadioButton guiNormIndividual;
	private JRadioButton guiNormGlobal;
	private JRadioButton guiNormNone;
	private boolean sOutputTD = false;
	private boolean sOutputAudioMP3 = false;
	private boolean sOutputExcel = false;
	private boolean sLogTransform = false;
	private boolean sStandardDevs = false;
	private JCheckBox guiOutputTD;
	private JCheckBox guiOutputAudioMP3;
	private JCheckBox guiOutputExcel;
	private JCheckBox guiLogTransform;
	private JCheckBox guiStandardDevs;
	private boolean sErrorBatch = false;		// if batch is false, Event must be true
	private JRadioButton guiErrorBatch;
	private JRadioButton guiErrorEvent;
	private JTextField guiToneLengthTxtVal;
	private JSlider guiToneLength;
	private JTabbedPane tabbedPane;
	protected JTextField graphTitleTxt;
	protected JTextField xAxisTitleTxt;
	protected JTextField yAxisTitleTxt;
	private JComboBox dataFormatComboBox = null;
	private JTextField yMinValueTxt;
	private JTextField yMaxValueTxt;
	protected JCheckBox yAxisTicksCheckBox;
	protected JComboBox yTickIntComboBox;
	protected JCheckBox yTickLabelsCheckBox;
	private JButton updateGraphBtn;
	private Hashtable<String,sheetTabPanel> INPUT_SHEETS = new Hashtable<String,sheetTabPanel>();
	private ColorUtils CU = new ColorUtils();
	private playThread PTHREAD = null;
	private File lastDirectory = null;
	private XSSFWorkbook inputWB = null;
	private FileInputStream FIS = null;
	private XSSFWorkbook outputWB = null;
	private XSSFSheet outputSHT = null;
	private FileWriter TDOutputWriter = null;
	private ArrayList<byte[]> audioOutputTones = null;
	private ArrayList<AudioFormat> audioOutputAFs = null;

	

	public static void main(String[] args) {
		EventQueue.invokeLater(new Runnable() {
			public void run() {
				try {
					new AudioFY();
				} catch (Exception e) {
					e.printStackTrace();
				}
			}
		});
	}

	/**
	 * Create the application.
	 */
	public AudioFY() {
		initialize();
		GUI_SETUP = true;
	}

	/**
	 * Initialize the contents of the frame.
	 */
	private void initialize() {
		frmAudiofyData = new JFrame();
		frmAudiofyData.setTitle("Audio-FY Data " + version);
		frmAudiofyData.setBounds(10, 10, 600, 565);
		frmAudiofyData.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
		
		frmAudiofyData.addWindowListener(new java.awt.event.WindowAdapter() {
	        public void windowClosing(WindowEvent winEvt) {
	        	sysExit();
	        }
	    });
		
		JMenuBar menuBar = new JMenuBar();
		frmAudiofyData.setJMenuBar(menuBar);
		
		JMenu mnNewMenu = new JMenu("File");
		menuBar.add(mnNewMenu);
		
		JMenuItem mntmNewMenuItem_2 = new JMenuItem("Clear Inputs");
		mnNewMenu.add(mntmNewMenuItem_2);
		mntmNewMenuItem_2.setActionCommand("Clear Inputs");
		mntmNewMenuItem_2.addActionListener(this);
		
		JMenuItem mntmNewMenuItem = new JMenuItem("Load Input File");
		mnNewMenu.add(mntmNewMenuItem);
		mntmNewMenuItem.setActionCommand("Specify Input File");
		mntmNewMenuItem.addActionListener(this);
		
		JMenuItem mntmNewMenuItem_8 = new JMenuItem("Reload Input File");
		mnNewMenu.add(mntmNewMenuItem_8);
		mntmNewMenuItem_8.setActionCommand("Reload Input File");
		mntmNewMenuItem_8.addActionListener(this);
		
		JMenuItem mntmNewMenuItem_9 = new JMenuItem("Test Input File");
		mnNewMenu.add(mntmNewMenuItem_9);
		mntmNewMenuItem_9.setActionCommand("Test Input File");
		mntmNewMenuItem_9.addActionListener(this);
		
		JSeparator separator_2 = new JSeparator();
		mnNewMenu.add(separator_2);
		
		JMenuItem mntmNewMenuItem_7 = new JMenuItem("Clear Output Directory");
		mnNewMenu.add(mntmNewMenuItem_7);
		mntmNewMenuItem_7.setActionCommand("Clear Output Directory");
		mntmNewMenuItem_7.addActionListener(this);
		
		JMenuItem mntmNewMenuItem_1 = new JMenuItem("Specify Output Directory");
		mnNewMenu.add(mntmNewMenuItem_1);
		mntmNewMenuItem_1.setActionCommand("Specify Output Directory");
		mntmNewMenuItem_1.addActionListener(this);
		
		JSeparator separator_1 = new JSeparator();
		mnNewMenu.add(separator_1);
		
		JMenuItem mntmNewMenuItem_3 = new JMenuItem("Clear Configurations");
		mnNewMenu.add(mntmNewMenuItem_3);
		mntmNewMenuItem_3.setActionCommand("Clear Configurations");
		mntmNewMenuItem_3.addActionListener(this);
		
		JMenuItem mntmNewMenuItem_4 = new JMenuItem("Load Configuration");
		mnNewMenu.add(mntmNewMenuItem_4);
		mntmNewMenuItem_4.setActionCommand("Load Configuration");
		mntmNewMenuItem_4.addActionListener(this);
		
		JMenuItem mntmNewMenuItem_5 = new JMenuItem("Save Configuration");
		mnNewMenu.add(mntmNewMenuItem_5);
		mntmNewMenuItem_5.setActionCommand("Save Configuration");
		mntmNewMenuItem_5.addActionListener(this);
		
		JSeparator separator = new JSeparator();
		mnNewMenu.add(separator);
		
		JMenuItem mntmNewMenuItem_6 = new JMenuItem("EXIT");
		mnNewMenu.add(mntmNewMenuItem_6);
		mntmNewMenuItem_6.setActionCommand("EXIT");
		GridBagLayout gridBagLayout = new GridBagLayout();
		gridBagLayout.columnWidths = new int[]{0, 0};
		gridBagLayout.rowHeights = new int[]{0, 0, 0};
		gridBagLayout.columnWeights = new double[]{1.0, Double.MIN_VALUE};
		gridBagLayout.rowWeights = new double[]{0.0, 1.0, Double.MIN_VALUE};
		frmAudiofyData.getContentPane().setLayout(gridBagLayout);
		
		JMenu mnNewMenu2 = new JMenu("Window");
		menuBar.add(mnNewMenu2);

		JMenuItem mntmNewMenuItem_10 = new JMenuItem("Display Windows to Front");
		mnNewMenu2.add(mntmNewMenuItem_10);
		mntmNewMenuItem_10.setActionCommand("Window To Front");
		mntmNewMenuItem_10.addActionListener(this);

		JPanel panel = new JPanel();
		GridBagConstraints gbc_panel = new GridBagConstraints();
		gbc_panel.insets = new Insets(5, 5, 5, 0);
		gbc_panel.fill = GridBagConstraints.BOTH;
		gbc_panel.gridx = 0;
		gbc_panel.gridy = 0;
		frmAudiofyData.getContentPane().add(panel, gbc_panel);
		GridBagLayout gbl_panel = new GridBagLayout();
		gbl_panel.columnWidths = new int[]{0, 0, 0};
		gbl_panel.rowHeights = new int[]{0, 0, 0};
		gbl_panel.columnWeights = new double[]{0.0, 1.0, Double.MIN_VALUE};
		gbl_panel.rowWeights = new double[]{0.0, 0.0, Double.MIN_VALUE};
		panel.setLayout(gbl_panel);
		
		JLabel lblNewLabel = new JLabel("Input File");
		lblNewLabel.setHorizontalAlignment(SwingConstants.RIGHT);
		GridBagConstraints gbc_lblNewLabel = new GridBagConstraints();
		gbc_lblNewLabel.anchor = GridBagConstraints.EAST;
		gbc_lblNewLabel.insets = new Insets(0, 0, 5, 5);
		gbc_lblNewLabel.gridx = 0;
		gbc_lblNewLabel.gridy = 0;
		panel.add(lblNewLabel, gbc_lblNewLabel);
		
		guiInputFile = new JTextField();
		guiInputFile.setEditable(false);
		GridBagConstraints gbc_guiInputFile = new GridBagConstraints();
		gbc_guiInputFile.insets = new Insets(0, 0, 5, 5);
		gbc_guiInputFile.fill = GridBagConstraints.HORIZONTAL;
		gbc_guiInputFile.gridx = 1;
		gbc_guiInputFile.gridy = 0;
		panel.add(guiInputFile, gbc_guiInputFile);
		guiInputFile.setColumns(10);
		
		JLabel lblNewLabel_1 = new JLabel("Output Directory");
		lblNewLabel_1.setHorizontalAlignment(SwingConstants.RIGHT);
		GridBagConstraints gbc_lblNewLabel_1 = new GridBagConstraints();
		gbc_lblNewLabel_1.anchor = GridBagConstraints.EAST;
		gbc_lblNewLabel_1.insets = new Insets(0, 5, 0, 5);
		gbc_lblNewLabel_1.gridx = 0;
		gbc_lblNewLabel_1.gridy = 1;
		panel.add(lblNewLabel_1, gbc_lblNewLabel_1);
		
		guiOutputFile = new JTextField();
		guiOutputFile.setEditable(false);
		GridBagConstraints gbc_guiOutputFile = new GridBagConstraints();
		gbc_guiOutputFile.insets = new Insets(0, 0, 0, 5);
		gbc_guiOutputFile.fill = GridBagConstraints.HORIZONTAL;
		gbc_guiOutputFile.gridx = 1;
		gbc_guiOutputFile.gridy = 1;
		panel.add(guiOutputFile, gbc_guiOutputFile);
		guiOutputFile.setColumns(10);
		
		JPanel panel_1 = new JPanel();
		GridBagConstraints gbc_panel_1 = new GridBagConstraints();
		gbc_panel_1.fill = GridBagConstraints.BOTH;
		gbc_panel_1.gridx = 0;
		gbc_panel_1.gridy = 1;
		frmAudiofyData.getContentPane().add(panel_1, gbc_panel_1);
		GridBagLayout gbl_panel_1 = new GridBagLayout();
		gbl_panel_1.columnWidths = new int[]{0, 0};
		gbl_panel_1.rowHeights = new int[]{0, 0};
		gbl_panel_1.columnWeights = new double[]{1.0, Double.MIN_VALUE};
		gbl_panel_1.rowWeights = new double[]{1.0, Double.MIN_VALUE};
		panel_1.setLayout(gbl_panel_1);
		
		tabbedPane = new JTabbedPane(JTabbedPane.TOP);
		GridBagConstraints gbc_tabbedPane = new GridBagConstraints();
		gbc_tabbedPane.insets = new Insets(5, 5, 5, 5);
		gbc_tabbedPane.fill = GridBagConstraints.BOTH;
		gbc_tabbedPane.gridx = 0;
		gbc_tabbedPane.gridy = 0;
		panel_1.add(tabbedPane, gbc_tabbedPane);
		mntmNewMenuItem_6.addActionListener(this);
		
		// General Configurations Tab
		JPanel panel2 = new JPanel();
	    tabbedPane.add("General Configurations",panel2);
	    GridBagLayout gbl_panel2 = new GridBagLayout();
	    gbl_panel2.columnWidths = new int[]{0, 0, 0, 0};
	    gbl_panel2.rowHeights = new int[]{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
	    gbl_panel2.columnWeights = new double[]{0.0, 0.0, 0.0, Double.MIN_VALUE};
	    gbl_panel2.rowWeights = new double[]{0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, Double.MIN_VALUE};
	    panel2.setLayout(gbl_panel2);
	    
	    JLabel lblNewLabel_2 = new JLabel("Frequency Range");
	    lblNewLabel_2.setFont(new Font("Tahoma", Font.BOLD, 11));
	    GridBagConstraints gbc_lblNewLabel_2 = new GridBagConstraints();
	    gbc_lblNewLabel_2.gridwidth = 3;
	    gbc_lblNewLabel_2.insets = new Insets(5, 0, 5, 0);
	    gbc_lblNewLabel_2.gridx = 0;
	    gbc_lblNewLabel_2.gridy = 0;
	    panel2.add(lblNewLabel_2, gbc_lblNewLabel_2);
	    
	    JLabel lblNewLabel_3 = new JLabel("Minimum Frequency");
	    lblNewLabel_3.setHorizontalAlignment(SwingConstants.RIGHT);
	    GridBagConstraints gbc_lblNewLabel_3 = new GridBagConstraints();
	    gbc_lblNewLabel_3.insets = new Insets(0, 5, 5, 5);
	    gbc_lblNewLabel_3.gridx = 0;
	    gbc_lblNewLabel_3.gridy = 1;
	    panel2.add(lblNewLabel_3, gbc_lblNewLabel_3);
	    
	    guiMinFreq = new JSlider();
	    guiMinFreq.addChangeListener(this);
	    guiMinFreq.setMinorTickSpacing(100);
	    guiMinFreq.setMajorTickSpacing(350);
	    guiMinFreq.setMaximum(MAX_FREQ);
	    guiMinFreq.setMinimum(MIN_FREQ);
	    guiMinFreq.setPaintTicks(true);
	    guiMinFreq.setPaintLabels(true);
	    guiMinFreq.setValue(MIN_FREQ);
	    GridBagConstraints gbc_guiMinFreq = new GridBagConstraints();
	    gbc_guiMinFreq.fill = GridBagConstraints.HORIZONTAL;
	    gbc_guiMinFreq.insets = new Insets(0, 0, 5, 5);
	    gbc_guiMinFreq.gridx = 1;
	    gbc_guiMinFreq.gridy = 1;
	    panel2.add(guiMinFreq, gbc_guiMinFreq);
	    
	    guiMinFreqTxtVal = new JTextField();
	    guiMinFreqTxtVal.addKeyListener(this);
	    GridBagConstraints gbc_guiMinFreqTxtVal = new GridBagConstraints();
	    gbc_guiMinFreqTxtVal.anchor = GridBagConstraints.WEST;
	    gbc_guiMinFreqTxtVal.insets = new Insets(0, 0, 5, 0);
	    gbc_guiMinFreqTxtVal.gridx = 2;
	    gbc_guiMinFreqTxtVal.gridy = 1;
	    panel2.add(guiMinFreqTxtVal, gbc_guiMinFreqTxtVal);
	    guiMinFreqTxtVal.setColumns(5);
	    guiMinFreqTxtVal.setText(String.valueOf(guiMinFreq.getValue()));
	    
	    JLabel lblNewLabel_4 = new JLabel("Maximum Frequency");
	    lblNewLabel_4.setHorizontalAlignment(SwingConstants.RIGHT);
	    GridBagConstraints gbc_lblNewLabel_4 = new GridBagConstraints();
	    gbc_lblNewLabel_4.insets = new Insets(0, 5, 5, 5);
	    gbc_lblNewLabel_4.gridx = 0;
	    gbc_lblNewLabel_4.gridy = 2;
	    panel2.add(lblNewLabel_4, gbc_lblNewLabel_4);
	    
	    guiMaxFreq = new JSlider();
	    guiMaxFreq.addChangeListener(this);
	    guiMaxFreq.setPaintTicks(true);
	    guiMaxFreq.setPaintLabels(true);
	    guiMaxFreq.setMinorTickSpacing(100);
	    guiMaxFreq.setMinimum(MIN_FREQ);
	    guiMaxFreq.setMaximum(MAX_FREQ);
	    guiMaxFreq.setMajorTickSpacing(350);
	    guiMaxFreq.setValue(MAX_FREQ);
	    GridBagConstraints gbc_guiMaxFreq = new GridBagConstraints();
	    gbc_guiMaxFreq.fill = GridBagConstraints.HORIZONTAL;
	    gbc_guiMaxFreq.insets = new Insets(0, 0, 5, 5);
	    gbc_guiMaxFreq.gridx = 1;
	    gbc_guiMaxFreq.gridy = 2;
	    panel2.add(guiMaxFreq, gbc_guiMaxFreq);
	    
	    guiMaxFreqTxtVal = new JTextField();
	    guiMaxFreqTxtVal.addKeyListener(this);
	    guiMaxFreqTxtVal.setColumns(5);
	    GridBagConstraints gbc_guiMaxFreqTxtVal = new GridBagConstraints();
	    gbc_guiMaxFreqTxtVal.insets = new Insets(0, 0, 5, 0);
	    gbc_guiMaxFreqTxtVal.anchor = GridBagConstraints.WEST;
	    gbc_guiMaxFreqTxtVal.gridx = 2;
	    gbc_guiMaxFreqTxtVal.gridy = 2;
	    panel2.add(guiMaxFreqTxtVal, gbc_guiMaxFreqTxtVal);
	    guiMaxFreqTxtVal.setText(String.valueOf(guiMaxFreq.getValue()));
	    
	    JLabel lblNewLabel_5 = new JLabel("Calculations");
	    lblNewLabel_5.setFont(new Font("Tahoma", Font.BOLD, 11));
	    GridBagConstraints gbc_lblNewLabel_5 = new GridBagConstraints();
	    gbc_lblNewLabel_5.gridwidth = 3;
	    gbc_lblNewLabel_5.insets = new Insets(5, 0, 5, 0);
	    gbc_lblNewLabel_5.gridx = 0;
	    gbc_lblNewLabel_5.gridy = 3;
	    panel2.add(lblNewLabel_5, gbc_lblNewLabel_5);
	    
	    JLabel lblNewLabel_6 = new JLabel("Log Transformation");
	    lblNewLabel_6.setHorizontalAlignment(SwingConstants.RIGHT);
	    GridBagConstraints gbc_lblNewLabel_6 = new GridBagConstraints();
	    gbc_lblNewLabel_6.anchor = GridBagConstraints.EAST;
	    gbc_lblNewLabel_6.insets = new Insets(0, 5, 5, 5);
	    gbc_lblNewLabel_6.gridx = 0;
	    gbc_lblNewLabel_6.gridy = 4;
	    panel2.add(lblNewLabel_6, gbc_lblNewLabel_6);
	    
	    guiLogTransform = new JCheckBox("");
	    guiLogTransform.addChangeListener(this);
	    GridBagConstraints gbc_guiLogTransform = new GridBagConstraints();
	    gbc_guiLogTransform.anchor = GridBagConstraints.WEST;
	    gbc_guiLogTransform.insets = new Insets(0, 0, 5, 5);
	    gbc_guiLogTransform.gridx = 1;
	    gbc_guiLogTransform.gridy = 4;
	    panel2.add(guiLogTransform, gbc_guiLogTransform);
	    
	    JLabel lblNewLabel_7 = new JLabel("Standard Deviations");
	    lblNewLabel_7.setHorizontalAlignment(SwingConstants.RIGHT);
	    GridBagConstraints gbc_lblNewLabel_7 = new GridBagConstraints();
	    gbc_lblNewLabel_7.anchor = GridBagConstraints.NORTH;
	    gbc_lblNewLabel_7.insets = new Insets(0, 5, 5, 5);
	    gbc_lblNewLabel_7.gridx = 0;
	    gbc_lblNewLabel_7.gridy = 5;
	    panel2.add(lblNewLabel_7, gbc_lblNewLabel_7);
	    
	    guiStandardDevs = new JCheckBox("");
	    guiStandardDevs.addChangeListener(this);
	    GridBagConstraints gbc_guiStandardDevs = new GridBagConstraints();
	    gbc_guiStandardDevs.anchor = GridBagConstraints.WEST;
	    gbc_guiStandardDevs.insets = new Insets(0, 0, 5, 5);
	    gbc_guiStandardDevs.gridx = 1;
	    gbc_guiStandardDevs.gridy = 5;
	    panel2.add(guiStandardDevs, gbc_guiStandardDevs);
	    
	    JLabel lblNewLabel_8 = new JLabel("Normalization");
	    lblNewLabel_8.setHorizontalAlignment(SwingConstants.RIGHT);
	    GridBagConstraints gbc_lblNewLabel_8 = new GridBagConstraints();
	    gbc_lblNewLabel_8.anchor = GridBagConstraints.EAST;
	    gbc_lblNewLabel_8.insets = new Insets(0, 5, 5, 5);
	    gbc_lblNewLabel_8.gridx = 0;
	    gbc_lblNewLabel_8.gridy = 6;
	    panel2.add(lblNewLabel_8, gbc_lblNewLabel_8);
	    
	    JPanel panel_2 = new JPanel();
	    GridBagConstraints gbc_panel_2 = new GridBagConstraints();
	    gbc_panel_2.insets = new Insets(0, 0, 5, 0);
	    gbc_panel_2.gridwidth = 2;
	    gbc_panel_2.anchor = GridBagConstraints.WEST;
	    gbc_panel_2.fill = GridBagConstraints.VERTICAL;
	    gbc_panel_2.gridx = 1;
	    gbc_panel_2.gridy = 6;
	    panel2.add(panel_2, gbc_panel_2);
	    
	    guiNormGlobal = new JRadioButton("Global");
	    guiNormGlobal.addChangeListener(this);
	    guiNormGlobal.setSelected(true);
	    sNorm = "G";
	    panel_2.add(guiNormGlobal);
	    
	    guiNormIndividual = new JRadioButton("Individual");
	    guiNormIndividual.addChangeListener(this);
	    panel_2.add(guiNormIndividual);
	    
	    guiNormNone = new JRadioButton("None");
	    guiNormNone.addChangeListener(this);
	    panel_2.add(guiNormNone);
	    ButtonGroup normGroup = new ButtonGroup();
	    normGroup.add(guiNormGlobal); normGroup.add(guiNormIndividual); normGroup.add(guiNormNone);
 
		 JLabel lblNewLabel_9 = new JLabel("Outputs");
		 lblNewLabel_9.setFont(new Font("Tahoma", Font.BOLD, 11));
		 GridBagConstraints gbc_lblNewLabel_9 = new GridBagConstraints();
		 gbc_lblNewLabel_9.insets = new Insets(0, 0, 5, 0);
		 gbc_lblNewLabel_9.gridwidth = 3;
		 gbc_lblNewLabel_9.gridx = 0;
		 gbc_lblNewLabel_9.gridy = 7;
		 panel2.add(lblNewLabel_9, gbc_lblNewLabel_9);
		 
		 JLabel lblNewLabel_10 = new JLabel("Error Reporting");
		 GridBagConstraints gbc_lblNewLabel_10 = new GridBagConstraints();
		 gbc_lblNewLabel_10.anchor = GridBagConstraints.EAST;
		 gbc_lblNewLabel_10.insets = new Insets(0, 0, 5, 5);
		 gbc_lblNewLabel_10.gridx = 0;
		 gbc_lblNewLabel_10.gridy = 8;
		 panel2.add(lblNewLabel_10, gbc_lblNewLabel_10);
		 
		 JPanel panel_3 = new JPanel();
		 GridBagConstraints gbc_panel_3 = new GridBagConstraints();
		 gbc_panel_3.anchor = GridBagConstraints.WEST;
		 gbc_panel_3.insets = new Insets(0, 0, 5, 5);
		 gbc_panel_3.fill = GridBagConstraints.VERTICAL;
		 gbc_panel_3.gridx = 1;
		 gbc_panel_3.gridy = 8;
		 panel2.add(panel_3, gbc_panel_3);
		 
		 guiErrorBatch = new JRadioButton("Batch");
		 guiErrorBatch.addChangeListener(this);
		 guiErrorBatch.setSelected(true);
		 sErrorBatch = true;
		 panel_3.add(guiErrorBatch);
		 
		 guiErrorEvent = new JRadioButton("Event");
		 guiErrorEvent.addChangeListener(this);
		 panel_3.add(guiErrorEvent);
		 ButtonGroup ErrorButtonGroup = new ButtonGroup();
		 ErrorButtonGroup.add(guiErrorBatch);
		 ErrorButtonGroup.add(guiErrorEvent);
		 
		 JLabel lblNewLabel_11 = new JLabel("Output Type");
		 GridBagConstraints gbc_lblNewLabel_11 = new GridBagConstraints();
		 gbc_lblNewLabel_11.anchor = GridBagConstraints.EAST;
		 gbc_lblNewLabel_11.insets = new Insets(0, 0, 5, 5);
		 gbc_lblNewLabel_11.gridx = 0;
		 gbc_lblNewLabel_11.gridy = 9;
		 panel2.add(lblNewLabel_11, gbc_lblNewLabel_11);
		 
		 JPanel panel_4 = new JPanel();
		 GridBagConstraints gbc_panel_4 = new GridBagConstraints();
		 gbc_panel_4.insets = new Insets(0, 0, 5, 5);
		 gbc_panel_4.fill = GridBagConstraints.BOTH;
		 gbc_panel_4.gridx = 1;
		 gbc_panel_4.gridy = 9;
		 panel2.add(panel_4, gbc_panel_4);
		 
		 guiOutputExcel = new JCheckBox("Excel (.xlsx)");
		 guiOutputExcel.addChangeListener(this);
		 panel_4.add(guiOutputExcel);
		 
		 guiOutputAudioMP3 = new JCheckBox("Audio (.mp3)");
		 guiOutputAudioMP3.addChangeListener(this);
		 panel_4.add(guiOutputAudioMP3);
		 
		 guiOutputTD = new JCheckBox("Tab-Delimited (.txt)");
		 guiOutputTD.addChangeListener(this);
		 panel_4.add(guiOutputTD);
		 
		 JLabel lblNewLabel_12 = new JLabel("Audio Settings");
		 lblNewLabel_12.setFont(new Font("Tahoma", Font.BOLD, 11));
		 GridBagConstraints gbc_lblNewLabel_12 = new GridBagConstraints();
		 gbc_lblNewLabel_12.insets = new Insets(0, 0, 5, 0);
		 gbc_lblNewLabel_12.gridwidth = 3;
		 gbc_lblNewLabel_12.anchor = GridBagConstraints.ABOVE_BASELINE;
		 gbc_lblNewLabel_12.gridx = 0;
		 gbc_lblNewLabel_12.gridy = 10;
		 panel2.add(lblNewLabel_12, gbc_lblNewLabel_12);
		 
		 JLabel lblNewLabel_13 = new JLabel("Tone Length (ms)");
		 GridBagConstraints gbc_lblNewLabel_13 = new GridBagConstraints();
		 gbc_lblNewLabel_13.anchor = GridBagConstraints.EAST;
		 gbc_lblNewLabel_13.insets = new Insets(0, 0, 0, 5);
		 gbc_lblNewLabel_13.gridx = 0;
		 gbc_lblNewLabel_13.gridy = 11;
		 panel2.add(lblNewLabel_13, gbc_lblNewLabel_13);
		 
		 guiToneLength = new JSlider();
		 guiToneLength.addChangeListener(this);
		 guiToneLength.setPaintTicks(true);
		 guiToneLength.setPaintLabels(true);
		 guiToneLength.setMinorTickSpacing(100);
		 guiToneLength.setMinimum(MIN_TONE_LENGTH);
		 guiToneLength.setMaximum(MAX_TONE_LENGTH);
		 guiToneLength.setMajorTickSpacing(200);
		 guiToneLength.setValue(DEFAULT_TONE_LENGTH);
		 GridBagConstraints gbc_guiToneLength = new GridBagConstraints();
		 gbc_guiToneLength.fill = GridBagConstraints.HORIZONTAL;
		 gbc_guiToneLength.insets = new Insets(0, 0, 0, 5);
		 gbc_guiToneLength.gridx = 1;
		 gbc_guiToneLength.gridy = 11;
		 panel2.add(guiToneLength, gbc_guiToneLength);
		 
		 guiToneLengthTxtVal = new JTextField();
		 guiToneLengthTxtVal.addKeyListener(this);
		 GridBagConstraints gbc_guiToneLengthTxtVal = new GridBagConstraints();
		 gbc_guiToneLengthTxtVal.anchor = GridBagConstraints.WEST;
		 gbc_guiToneLengthTxtVal.gridx = 2;
		 gbc_guiToneLengthTxtVal.gridy = 11;
		 panel2.add(guiToneLengthTxtVal, gbc_guiToneLengthTxtVal);
		 guiToneLengthTxtVal.setColumns(5);
		 guiToneLengthTxtVal.setText("150");
		 
		 // Graph Configuration Tab 
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
		    gbl_yAxisDataHeaderPanel.columnWeights = new double[]{0.0, 0.0, 0.0, 0.0, 0.0, 1.0, Double.MIN_VALUE};
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
		    GridBagConstraints gbc_yMinValueTxt = new GridBagConstraints();
		    gbc_yMinValueTxt.fill = GridBagConstraints.HORIZONTAL;
		    gbc_yMinValueTxt.insets = new Insets(10, 5, 5, 5);
		    gbc_yMinValueTxt.gridx = 2;
		    gbc_yMinValueTxt.gridy = 1;
		    yAxisDataHeaderPanel.add(yMinValueTxt, gbc_yMinValueTxt);
		    yMinValueTxt.setColumns(5);
		    yMinValueTxt.setText("-1"); //default value for create_configs, overwritten on gp initialisation
		    
		    JLabel yMaxValueLbl = new JLabel("Maximum Value");
		    GridBagConstraints gbc_yMaxValueLbl = new GridBagConstraints();
		    gbc_yMaxValueLbl.anchor = GridBagConstraints.EAST;
		    gbc_yMaxValueLbl.insets = new Insets(10, 5, 5, 5);
		    gbc_yMaxValueLbl.gridx = 4;
		    gbc_yMaxValueLbl.gridy = 1;
		    yAxisDataHeaderPanel.add(yMaxValueLbl, gbc_yMaxValueLbl);
		    
		    yMaxValueTxt = new JTextField();
		    GridBagConstraints gbc_yMaxValueTxt = new GridBagConstraints();
		    gbc_yMaxValueTxt.fill = GridBagConstraints.HORIZONTAL;
		    gbc_yMaxValueTxt.insets = new Insets(10, 5, 5, 0);
		    gbc_yMaxValueTxt.gridx = 5;
		    gbc_yMaxValueTxt.gridy = 1;
		    yAxisDataHeaderPanel.add(yMaxValueTxt, gbc_yMaxValueTxt);
		    yMaxValueTxt.setColumns(5);
		    yMaxValueTxt.setText("-1");	//default value for create_configs, overwritten on gp initialisation
		    
		    
		    yAxisTicksCheckBox = new JCheckBox("   Axis Tick Lines");
		    GridBagConstraints gbc_yAxisTicksCheckBox = new GridBagConstraints();
		    gbc_yAxisTicksCheckBox.insets = new Insets(10, 0, 0, 5);
		    gbc_yAxisTicksCheckBox.gridx = 1;
		    gbc_yAxisTicksCheckBox.gridy = 2;
		    yAxisDataHeaderPanel.add(yAxisTicksCheckBox, gbc_yAxisTicksCheckBox);
		    yAxisTicksCheckBox.addChangeListener(this);
		    yAxisTicksCheckBox.setActionCommand("AXIS TICK CHECKBOX");
		    yAxisTicksCheckBox.setSelected(false);
		    
		    JLabel yTickIntervalLbl = new JLabel("Number of Tick Lines");
		    // JLabel yTickIntervalLbl = new JLabel("Tick Interval");
		    yTickIntervalLbl.setToolTipText("Tick Lines are evenly distributed amongst the Graph Area");
		    GridBagConstraints gbc_yTickIntervalLbl = new GridBagConstraints();
		    gbc_yTickIntervalLbl.anchor = GridBagConstraints.EAST;
		    gbc_yTickIntervalLbl.gridwidth = 2;
		    gbc_yTickIntervalLbl.insets = new Insets(10, 0, 0, 5);
		    gbc_yTickIntervalLbl.gridx = 2;
		    gbc_yTickIntervalLbl.gridy = 2;
		    yAxisDataHeaderPanel.add(yTickIntervalLbl, gbc_yTickIntervalLbl);
		    
			yTickIntComboBox = new JComboBox();
			yTickIntComboBox.setToolTipText("Tick Lines are evenly distributed amongst the Graph Area");
			// yTickIntComboBox.setModel(new DefaultComboBoxModel(new String[] {"50%", "33%", "25%", "10%"}));
			yTickIntComboBox.setModel(new DefaultComboBoxModel(new String[] {"2", "3", "4", "10"}));
			yTickIntComboBox.setSelectedIndex(0);
			GridBagConstraints gbc_yTickIntComboBox = new GridBagConstraints();
			gbc_yTickIntComboBox.anchor = GridBagConstraints.SOUTH;
			gbc_yTickIntComboBox.insets = new Insets(10, 0, 0, 5);
			gbc_yTickIntComboBox.fill = GridBagConstraints.HORIZONTAL;
			gbc_yTickIntComboBox.gridx = 4;
			gbc_yTickIntComboBox.gridy = 2;
			yAxisDataHeaderPanel.add(yTickIntComboBox, gbc_yTickIntComboBox);
			yTickIntComboBox.setEnabled(false);
						 
			yTickLabelsCheckBox = new JCheckBox("   Tick Labels");
			GridBagConstraints gbc_yTickLabelsCheckBox = new GridBagConstraints();
			gbc_yTickLabelsCheckBox.insets = new Insets(10, 5, 0, 5);
			gbc_yTickLabelsCheckBox.gridx = 5;
			gbc_yTickLabelsCheckBox.gridy = 2;
			yAxisDataHeaderPanel.add(yTickLabelsCheckBox, gbc_yTickLabelsCheckBox);
			yTickLabelsCheckBox.setSelected(false);
			yTickLabelsCheckBox.setEnabled(false);
		    
		    updateGraphBtn = new JButton("Update Graph");
		    updateGraphBtn.addActionListener(this);
			updateGraphBtn.setActionCommand("Update Graph");
			GridBagConstraints gbc_updateGraphBtn = new GridBagConstraints();
			gbc_updateGraphBtn.insets = new Insets(0, 0, 5, 5);
			gbc_updateGraphBtn.gridx = 3;
			gbc_updateGraphBtn.gridy = 7;
			graphConfPanel.add(updateGraphBtn, gbc_updateGraphBtn);


		 DP_FRAME = new JFrame();
		 DP_FRAME.setType(Type.UTILITY);
		 DP_FRAME.getRootPane().setBorder(
				 BorderFactory.createMatteBorder(BORDER_SIZE, BORDER_SIZE, BORDER_SIZE, BORDER_SIZE, Color.orange)		 
				 ); 
		 DP = new dataPanel(DP_FRAME, BORDER_SIZE, CU, this);
		 DP_FRAME.addMouseListener(DP);
		 DP_FRAME.addMouseMotionListener(DP);
		 DP_FRAME.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
		 DP_FRAME.setUndecorated(true);
		 
		 DP_FRAME.setBounds(620, 500, 600, 300);
		 DP_FRAME.getContentPane().add(DP);
		 DP_FRAME.setVisible(true);
		 
		 PW_FRAME = new JFrame();
		 PW_FRAME.setType(Type.UTILITY);
		 PP = new playPanel(PW_FRAME, BORDER_SIZE, this, create_configurations());		 
		 //JScrollPane PPScrollPane = new JScrollPane(PP.getGP());
		 //PPScrollPane.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_AS_NEEDED);
	     //PPScrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_NEVER);
	     //PPScrollPane.setBounds(640, 400, 500, 20);
		 DP.setPlayPanel(PP); // need it here because PW wasn't setup yet and is needed
		 PW_FRAME.addMouseListener(PP);
		 PW_FRAME.addMouseMotionListener(PP);
		 PW_FRAME.setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
		 PW_FRAME.setUndecorated(true);
		 PW_FRAME.getRootPane().setBorder(
			BorderFactory.createMatteBorder(BORDER_SIZE, BORDER_SIZE, BORDER_SIZE, BORDER_SIZE, Color.orange)		 
		 );	
		 PW_FRAME.getContentPane().add(PP);
		 PW_FRAME.setBounds(620, 10, 600, 400);
		 PW_FRAME.setVisible(true);

		 
		 frmAudiofyData.setVisible(true);
		 PTHREAD = new playThread(this,PP,DP);
		 PP.setPlayThread(PTHREAD);
		 PTHREAD.start();
		 
		 // Fill textboxes at end after panels/GUI variables have been established for abstraction
		 graphTitleTxt.setText(PP.getGP().getGraphTitle());		
		 xAxisTitleTxt.setText(PP.getGP().getxAxisTitle());
		 yAxisTitleTxt.setText(PP.getGP().getyAxisTitle());
		 yMinValueTxt.setText(String.valueOf(PP.getGP().getyMinDefault()));
		 yMaxValueTxt.setText(String.valueOf(PP.getGP().getyMaxDefault()));


	}

	public void clearInputs(boolean removeInFile) {	
		INPUT_SHEETS.clear();
		if (removeInFile) {
			guiInputFile.setText("");
		}
		for (int i=tabbedPane.getTabCount()-1; i>1; --i) {
			tabbedPane.remove(i);
		}
		DP.resetDataTable();
		//reset graph panel to basic image
		PP.resetGraphWindowDefault();
		
	}
	
	public void setNeedSave(boolean yorn) {
		needSave = yorn;
	}
	
	public void actionPerformed(ActionEvent e) {
		if (e.getActionCommand().equals("Clear Inputs")) {
			clearInputs(true);
			JOptionPane.showMessageDialog(frmAudiofyData, "Input File has been Cleared.", "Success!", JOptionPane.INFORMATION_MESSAGE);
		} else if (e.getActionCommand().equals("Specify Input File") || e.getActionCommand().equals("Reload Input File")) {
			Configurations config = create_configurations();
			if (needSave) {
				int returnVal = saveDialogue();
				if (returnVal == 1) {
					return;
				}
				needSave = false;
			}	
			JFileChooser fc = new JFileChooser();
			if(lastDirectory != null) {
				fc.setCurrentDirectory(lastDirectory);
			}
			
			if (e.getActionCommand().equals("Specify Input File")) {
				int returnVal = fc.showOpenDialog(frmAudiofyData);
				if (returnVal == 1) {
					return;
				}
			}
			try {
				String fileName = "";
				if (e.getActionCommand().equals("Specify Input File")) {
					clearInputs(true);
					fileName = fc.getSelectedFile().getAbsolutePath();
					lastDirectory = fc.getSelectedFile();
				} else {
					clearInputs(false);
					fileName = guiInputFile.getText();
					if (fileName.isEmpty()) {
						throw new IOException("Cannot Reload File - No Previous File is Specified to Reload");
					}
				}		
				ArrayList<sheetTabPanel> STP = loadInputFile(fileName);
				for (int i=0; i<STP.size(); ++i) {
					sheetTabPanel stp = STP.get(i);
					INPUT_SHEETS.put(stp.getSheetName(), stp);
					tabbedPane.add(stp.getSheetName(),stp);
				}
				
				if(e.getActionCommand().equals("Reload Input File")) {
					configureSheets(config.getDataSheets());
				}
				
				PTHREAD.setWB(inputWB);
				PTHREAD.setCurrentConfigurations(create_configurations());
				PTHREAD.setCurrentDSSList(getDSSList());
				updateDPvariables();
				PTHREAD.setGlobalMinMax(getGlobalMinMax());
				PP.getGP().paintComponent(PP.getGP().getGraphics());
				//PTHREAD.executeIndex(false, 0);		//<-- Not sure why, but this was breaking this function
			} catch (Exception E) {
				E.printStackTrace();
				if(!E.getMessage().equals("")) {
					JOptionPane.showMessageDialog(frmAudiofyData, E.getMessage(), "Error Alert", JOptionPane.ERROR_MESSAGE);
				}
				return;
			}
			if (e.getActionCommand().equals("Specify Input File")) {
				guiInputFile.setText(fc.getSelectedFile().getAbsolutePath());
			}
			needSave = true;		// Specifying a new input file -> needSave
			String txt = "Loaded";
			if (e.getActionCommand().equals("Reload Input File")) {
				txt = "Reloaded";
			}
			JOptionPane.showMessageDialog(frmAudiofyData, "Input File has been " + txt + ".", "Success!", JOptionPane.INFORMATION_MESSAGE);
		} else if (e.getActionCommand().equals("Specify Output Directory")) {
			JFileChooser fc = new JFileChooser();
			if(lastDirectory != null) {
				fc.setCurrentDirectory(lastDirectory);
			}
			fc.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
			int returnVal = fc.showSaveDialog(frmAudiofyData);
			if (returnVal == 1) {
				return;
			}
			File userDirectory = fc.getSelectedFile();
			lastDirectory = userDirectory;
			guiOutputFile.setText(userDirectory.getAbsolutePath());
			needSave = true;
		} else if (e.getActionCommand().equals("Clear Configurations")) {
			if (needSave) {
				int returnVal = saveDialogue();
				if (returnVal == 1) {
					return;
				}
			}

			DP.resetDataTable();
			PP.resetGraphWindowDefault();
			guiMinFreq.setValue(MIN_FREQ);
			guiMaxFreq.setValue(MAX_FREQ);
			guiNormGlobal.setSelected(true);
			guiOutputTD.setSelected(false);
			guiOutputAudioMP3.setSelected(false);
			guiOutputExcel.setSelected(false);
			guiLogTransform.setSelected(false);
			guiStandardDevs.setSelected(false);
			guiErrorBatch.setSelected(true);
			guiToneLength.setValue(DEFAULT_TONE_LENGTH);
			
			graphTitleTxt.setText(PP.getGP().getGraphTitle());
			xAxisTitleTxt.setText(PP.getGP().getxAxisTitle());
			yAxisTitleTxt.setText(PP.getGP().getyAxisTitle());
			dataFormatComboBox.setSelectedIndex(3);
			yMinValueTxt.setText(String.valueOf(PP.getGP().getyMinDefault()));
			yMaxValueTxt.setText(String.valueOf(PP.getGP().getyMaxDefault()));
			yAxisTicksCheckBox.setSelected(false);
			yTickIntComboBox.setSelectedIndex(0);
			yTickIntComboBox.setEnabled(false);
			yTickLabelsCheckBox.setSelected(false);
			yTickLabelsCheckBox.setEnabled(false);

			Enumeration<String> inputSheets = INPUT_SHEETS.keys();
			while (inputSheets.hasMoreElements()) {
				String nameOfSheet = inputSheets.nextElement();
				sheetTabPanel stp = INPUT_SHEETS.get(nameOfSheet);
				stp.getDataHeader().setSelectedIndices(new int[] {});
				INPUT_SHEETS.put(nameOfSheet, stp);
			}
			needSave = false;
		} else if (e.getActionCommand().equals("Load Configuration")) {
			if (needSave) {
				int returnVal = saveDialogue();
				if (returnVal == 1) {
					return;
				}
				needSave = false;
			}
			JFileChooser fc = new JFileChooser();
			if(lastDirectory != null) {
				fc.setCurrentDirectory(lastDirectory);
			}
			int returnVal = fc.showOpenDialog(frmAudiofyData);
			if (returnVal == 1) {
				return;
			}
			File openFile = fc.getSelectedFile();
			lastDirectory = openFile;
			
			try {
				Configurations conf = new Configurations();
				conf = conf.loadObject(openFile);
				DP.setColorList(conf.getColorList());
				guiToneLength.setValue(conf.getToneLength());
				guiMinFreq.setValue(Integer.valueOf(conf.getMinFreq()));
				guiMaxFreq.setValue(Integer.valueOf(conf.getMaxFreq()));
				if (conf.getNormalization().equals("Global")) {
					guiNormGlobal.setSelected(true);
				} else if (conf.getNormalization().equals("Individual")) {
					guiNormIndividual.setSelected(true);
				} else {
					guiNormNone.setSelected(true);
				}
				if (conf.isBatchError()) {
					guiErrorBatch.setSelected(true);
				} else {
					guiErrorEvent.setSelected(true);
				}
				guiOutputTD.setSelected(conf.isTDOutput());
				guiOutputExcel.setSelected(conf.isExcelOutput());
				guiOutputAudioMP3.setSelected(conf.isAudioOutput());
				guiLogTransform.setSelected(conf.isLogTransform());
				guiStandardDevs.setSelected(conf.isStandardDevs());
				guiOutputFile.setText(conf.getOutputDirectory());
				guiInputFile.setText(conf.getInputFile());
				graphTitleTxt.setText(conf.getGraphTitle());
				xAxisTitleTxt.setText(conf.getxAxisTitle());
				yAxisTitleTxt.setText(conf.getyAxisTitle());
				dataFormatComboBox.setSelectedIndex(conf.getGraphDataFormatIndex());
				yMinValueTxt.setText(String.valueOf(conf.getyAxisMin()));
				yMaxValueTxt.setText(String.valueOf(conf.getyAxisMax()));
				yAxisTicksCheckBox.setSelected(conf.isyAxisTicks());
				yTickIntComboBox.setSelectedIndex(conf.getyTickIntIndex());
				yTickIntComboBox.setEnabled(conf.isyAxisTicks());
				yTickLabelsCheckBox.setEnabled(conf.isyAxisTicks());
				yTickLabelsCheckBox.setSelected(conf.isyTickLabels());
				
				try {
					if (!conf.getInputFile().isEmpty()) {
						ArrayList<sheetTabPanel> STP = loadInputFile(conf.getInputFile());
						for (int i=0; i<STP.size(); ++i) {
							sheetTabPanel stp = STP.get(i);
							INPUT_SHEETS.put(stp.getSheetName(), stp);
							tabbedPane.add(stp.getSheetName(),stp);
						}
						configureSheets(conf.getDataSheets());
					}
					
					PTHREAD.setWB(inputWB);
					PTHREAD.setCurrentConfigurations(create_configurations());
					PTHREAD.setCurrentDSSList(getDSSList());
					PTHREAD.setGlobalMinMax(getGlobalMinMax());
					PTHREAD.executeIndex(false, 0);
				} catch (Exception ee) {
					ee.printStackTrace();
					guiInputFile.setText("");
					throw new Exception ("Could not load Input File: " + ee.getMessage());
				}
			} catch (Exception E) {
				E.printStackTrace();
				JOptionPane.showMessageDialog(frmAudiofyData, E.getMessage(), "Error Alert", JOptionPane.ERROR_MESSAGE);
				return;
			}
			needSave = false;
			JOptionPane.showMessageDialog(frmAudiofyData, "Configuration File has been Loaded.", "Success!", JOptionPane.INFORMATION_MESSAGE);
		} else if (e.getActionCommand().equals("Save Configuration")) {
			saveConfigurations();
		} else if (e.getActionCommand().equals("Clear Output Directory")) {
			guiOutputFile.setText("");
			needSave = true;
		} else if (e.getActionCommand().equals("Window To Front")) {
			PW_FRAME.toFront();
			DP_FRAME.toFront();
		} else if (e.getActionCommand().equals("Test Input File")) {
			// TODO :
		} else if (e.getActionCommand().equals("EXIT")) {
			sysExit();
		} else if (e.getActionCommand().equals("Update Graph")) {	// TODO : clear graph components if pressed and buttons are unchecked
			if (PTHREAD.isRunning()) {
				PTHREAD.setStop(true);
				PTHREAD.setRunning(false);
				JOptionPane.showMessageDialog(frmAudiofyData, "ERROR: Cannot Update Graph while play-through is running."
						+ "Press Play to continue your current play-through, or \ntry again when the play-through is not running." ,
						"Error Alert", JOptionPane.ERROR_MESSAGE);
			} else {
				//PP.getGP().clearGraph(PP.getGP().getGraphics());
				// handle dataFormat/minMax values for graph
				double[] minMax = getGlobalMinMax();
				if (dataFormatComboBox.getSelectedIndex()==0) {	//raw data value
					PP.getGP().setyMinDefault(String.valueOf(minMax[0]));
					PP.getGP().setyMaxDefault(String.valueOf(minMax[1]));
					yMinValueTxt.setText(String.valueOf(minMax[0]));
					yMaxValueTxt.setText(String.valueOf(minMax[1]));
					PP.setDataFormatIndex(0);
				} else if (dataFormatComboBox.getSelectedIndex()==1) {	//normalized value - 0-1
					PP.getGP().setyMinDefault("0");
					PP.getGP().setyMaxDefault("0");
					yMinValueTxt.setText("0");
					yMaxValueTxt.setText("1");
					PP.setDataFormatIndex(1);
				} else if (dataFormatComboBox.getSelectedIndex()==2) {	//log transform value	--> NEED TO LIMIT DECIMAL PLACES ON DOUBLES
					PP.getGP().setyMinDefault(String.valueOf(Math.log(minMax[0])));
					PP.getGP().setyMaxDefault(String.valueOf(Math.log(minMax[1])));
					yMinValueTxt.setText(String.valueOf(minMax[0]));
					yMaxValueTxt.setText(String.valueOf(minMax[1]));
					PP.setDataFormatIndex(2);
				} else {	 // Hz value, dataFormatIndex=3
						if(Integer.valueOf(yMaxValueTxt.getText()) > Integer.valueOf(guiMaxFreqTxtVal.getText())) {
							JOptionPane.showMessageDialog(frmAudiofyData, "ERROR: Y-Max is greater than max frequency" ,
									"Error Alert", JOptionPane.ERROR_MESSAGE);
						}
						if(Integer.valueOf(yMaxValueTxt.getText()) < Integer.valueOf(guiMaxFreqTxtVal.getText())) {
							JOptionPane.showMessageDialog(frmAudiofyData, "ERROR: Y-Max  is less than max frequency - Graph Image Loss"
									+ "\nConsider adjusting Max Frequency in General Configurations",
									"Error Alert", JOptionPane.ERROR_MESSAGE);
						}
					PP.getGP().setyMinDefault("0");	// Using 0 instead of guiMinFreqTxtVal.getText() for formatting/whitespace at bottom of graph
					PP.getGP().setyMaxDefault(guiMaxFreqTxtVal.getText());
					yMinValueTxt.setText("0"); // Rather than guiMinFreqTxtVal.getText()
					yMaxValueTxt.setText(guiMaxFreqTxtVal.getText());
					PP.setDataFormatIndex(4);
				}
				// Update graph variables and visuals:
				PP.getCONFIG().setyAxisTicks(yAxisTicksCheckBox.isSelected());
				PP.getCONFIG().setyTickIntIndex(Integer.valueOf((String) yTickIntComboBox.getSelectedItem()));
				PP.getCONFIG().setyTickLabels(yTickLabelsCheckBox.isSelected());
				PP.getGP().updateRepaintGP(PTHREAD, PP.getGP().getGraphics(), this);

				// raw, normalized, log(), Proportional, Hz, Std Dev, Sq Std Dev
			}
		} else {
			JOptionPane.showMessageDialog(frmAudiofyData, "Unknown action command: " + e.getActionCommand(), "Error Alert", JOptionPane.ERROR_MESSAGE);
		}
		
	}
	
	public Hashtable<String,sheetTabPanel> getSheetPanels() {
		return INPUT_SHEETS;
	}
	
	private void sysExit() {
		if (needSave) {
			int returnVal = saveDialogue();
			if (returnVal == 1) {
				return;
			}
		}
		
		if(inputWB != null) {
			try { 
				inputWB.close(); 
			} catch(Exception e) {
				e.printStackTrace();
			}
			inputWB = null;
		}
		
		if(FIS != null) {
			try { 
				FIS.close(); 
			} catch(Exception e) {
				e.printStackTrace();
			}
			FIS = null;
		}
		
		System.exit(0);
	}

	public void stateChanged(ChangeEvent e) {
		boolean changeSave = false;
		if (GUI_SETUP) {	// doesn't start change listener until after the gui is setup --> prevents noticing initializing as a "change"
			int min = guiMinFreq.getValue();
			int max = guiMaxFreq.getValue();	
			if(e.getSource().equals(guiMinFreq)) {
				if (min >= MAX_FREQ) {
					guiMinFreq.setValue(MAX_FREQ-1);
					guiMaxFreq.setValue(MAX_FREQ);
				} else if (min >= max) {
					guiMaxFreq.setValue(min + 1);
				}
				guiMinFreqTxtVal.setText(String.valueOf(guiMinFreq.getValue()));
				changeSave = true;
			} else if (e.getSource().equals(guiMaxFreq)) {
				if (max <= MIN_FREQ) {
					guiMaxFreq.setValue(MIN_FREQ+1);
					guiMinFreq.setValue(MIN_FREQ);
				} else if (max <= min) {
					guiMinFreq.setValue(max-1);
				}
				guiMaxFreqTxtVal.setText(String.valueOf(guiMaxFreq.getValue()));
				changeSave = true;
			} else if (e.getSource().equals(guiToneLength)) {
				guiToneLengthTxtVal.setText(String.valueOf(guiToneLength.getValue()));
				changeSave = true;
			} else if (e.getSource().equals(yAxisTicksCheckBox)) {
				Configurations currCF = PP.getCONFIG();
				boolean isChecked = yAxisTicksCheckBox.isSelected();
				currCF.setyTickLabels(isChecked);
				yTickIntComboBox.setEnabled(isChecked);
				currCF.setyAxisTicks(isChecked);
				if (!isChecked) {
					yTickLabelsCheckBox.setSelected(isChecked);
				}
				yTickLabelsCheckBox.setEnabled(isChecked);
				currCF.setyTickIntIndex(Integer.valueOf( (String) yTickIntComboBox.getSelectedItem()));
			} else {
				if ((sErrorBatch && !guiErrorBatch.isSelected()) || (!sErrorBatch && guiErrorBatch.isSelected())) {
					changeSave = true;
					sErrorBatch = guiErrorBatch.isSelected();
				}
				if ((sNorm.equals("G") && !guiNormGlobal.isSelected()) || (sNorm.equals("I") && !guiNormIndividual.isSelected()) || 
				(sNorm.equals("N") && !guiNormNone.isSelected())) {		// true state change
					changeSave = true;
					if (guiNormGlobal.isSelected()) {
						sNorm = "G";
					} else if (guiNormIndividual.isSelected()) {
						sNorm = "I";
					} else {
						sNorm = "N";
					}
				}
				Configurations currCF = PP.getCONFIG();
				if ((sOutputTD && !guiOutputTD.isSelected()) || (!sOutputTD && guiOutputTD.isSelected())) {
					changeSave = true;
					sOutputTD = guiOutputTD.isSelected();
					currCF.setTDOutput(sOutputTD);
				}
				if ((sOutputExcel && !guiOutputExcel.isSelected()) || (!sOutputExcel && guiOutputExcel.isSelected())) {
					changeSave = true;
					sOutputExcel = guiOutputExcel.isSelected();
					currCF.setExcelOutput(sOutputExcel);
				}
				if ((sOutputAudioMP3 && !guiOutputAudioMP3.isSelected()) || (!sOutputAudioMP3 && guiOutputAudioMP3.isSelected())) {
					changeSave = true;
					sOutputAudioMP3 = guiOutputAudioMP3.isSelected();
					currCF.setAudioOutput(sOutputAudioMP3);
				}
				if ((sLogTransform && !guiLogTransform.isSelected()) || (!sLogTransform && guiLogTransform.isSelected())) {
					changeSave = true;
					sLogTransform = guiLogTransform.isSelected();
				}
				if ((sStandardDevs && !guiStandardDevs.isSelected()) || (!sStandardDevs && guiStandardDevs.isSelected())) {
					changeSave = true;
					sStandardDevs = guiStandardDevs.isSelected();
				}
			}
			if (changeSave) {
				needSave = true;
			}
			
			// TODO - need to update the active displays (PP and DP) post changes
		}
	}
	
	public void keyTyped(KeyEvent e) {
	}
	
	public void keyPressed(KeyEvent e) {
		if (e.getKeyCode() == KeyEvent.VK_ENTER) {
			try {
				int val = 0;
				if (e.getSource().equals(guiToneLengthTxtVal)) {
					String value = guiToneLengthTxtVal.getText();
					try {
						val = Integer.valueOf(value);
					} catch (Exception ee) {
						throw new Exception(value + " is not a valid integer between " + MIN_TONE_LENGTH + " and " + MAX_TONE_LENGTH);
					}
					if (val < MIN_TONE_LENGTH || val > MAX_TONE_LENGTH) {
						throw new Exception("The tone length must be a value between " + MIN_TONE_LENGTH + " and " + MAX_TONE_LENGTH);
					}
					guiToneLength.setValue(val);
					needSave = true;
				} else if (e.getSource().equals(guiMinFreqTxtVal)) {
					String value = guiMinFreqTxtVal.getText();
					try {
						val = Integer.valueOf(value);
					} catch (Exception ee) {
						throw new Exception(value + " is not a valid integer between " + MIN_FREQ + " and " + (MAX_FREQ-1));
					}
					if (val < MIN_FREQ || val > MAX_FREQ-1) {
						throw new Exception("The MIN frequency must be a value between " + MIN_FREQ + " and " + (MAX_FREQ-1));
					}
					guiMinFreq.setValue(val);
					needSave = true;
				} else if (e.getSource().equals(guiMaxFreqTxtVal)) {
					String value = guiMaxFreqTxtVal.getText();
					try {
						val = Integer.valueOf(value);
					} catch (Exception ee) {
						throw new Exception(value + " is not a valid integer between " + (MIN_FREQ+1) + " and " + (MAX_FREQ));
					}
					if (val < MIN_FREQ+1 || val > MAX_FREQ) {
						throw new Exception("The MAX frequency must be a value between " + (MIN_FREQ+1) + " and " + MAX_FREQ);
					}					
					guiMaxFreq.setValue(val);
					needSave = true;
				}
			} catch(Exception E) {
				E.printStackTrace();
				JOptionPane.showMessageDialog(frmAudiofyData, E.getMessage(), "Error Alert", JOptionPane.ERROR_MESSAGE);
				return;
			}
		}
		
	}

	public void keyReleased(KeyEvent e) {
	}
	
	public void configureSheets(Hashtable<String,ArrayList<String>> configs) {
		Enumeration<String> sheets = configs.keys();
		while (sheets.hasMoreElements()) {
			String sheetName = sheets.nextElement();
			if (!INPUT_SHEETS.containsKey(sheetName)) {
				continue;
			}
			sheetTabPanel sTab = INPUT_SHEETS.get(sheetName);
			ArrayList<String> configsBySheet = configs.get(sheetName);
			if (configsBySheet.isEmpty()) {
				continue;
			}
			
			/*
			 * Commented code is to handle case of Row headers 
			 *
			boolean rowHeader = Boolean.valueOf(configsBySheet.get(0));
			if ((sTab.getRowHeader().isSelected() && !rowHeader) || (sTab.getColumnHeader().isSelected() && rowHeader)) {
				if (rowHeader) {
					sTab.getRowHeader().setSelected(true);
					sTab.getColumnHeader().setSelected(false);
				} else {
				
					sTab.getRowHeader().setSelected(false);
					sTab.getColumnHeader().setSelected(true);
				}
			} */
			
			ListModel<String> model = sTab.getDataHeader().getModel();
			ArrayList<Integer> indexes = new ArrayList<Integer>();
			for (int i=0; i < model.getSize(); ++i) {
				if (configsBySheet.contains(model.getElementAt(i))) {
					indexes.add(i);
				}
			}
			if (!indexes.isEmpty()) {
				int[] indexList = new int[indexes.size()];
				for (int i = 0; i<indexes.size(); ++i) {
					indexList[i] = indexes.get(i);
				}
				sTab.setSelected(indexList);
			}
			INPUT_SHEETS.put(sheetName, sTab);
		}
	}
	
	public int saveConfigurations() {
		JFileChooser fc = new JFileChooser();
		if(lastDirectory != null) {
			fc.setCurrentDirectory(lastDirectory);
		}
		int returnVal = fc.showSaveDialog(frmAudiofyData);
		if (returnVal == 1) {
			return 1;
		}
		File saveFile = fc.getSelectedFile();
		lastDirectory = saveFile;
		
		Configurations config = create_configurations();
		
		try {
			config.saveObject(saveFile, config);
		} catch (Exception E) {
			E.printStackTrace();
			JOptionPane.showMessageDialog(frmAudiofyData, E.getMessage(), "Error Alert", JOptionPane.ERROR_MESSAGE);
			return 1;
		}
		JOptionPane.showMessageDialog(frmAudiofyData, "Configuration File has been Saved.", "Success!", JOptionPane.INFORMATION_MESSAGE);
		needSave = false;
		return 0;
	}
	
	public Configurations create_configurations() {
		Configurations config = new Configurations();
		
		config.setColorList(DP.getColorList());
		config.setToneLength(guiToneLength.getValue());
		config.setInputFile(guiInputFile.getText());
		config.setOutputDirectory(guiOutputFile.getText());
		config.setMinFreq(String.valueOf(guiMinFreq.getValue())); 
		config.setMaxFreq(String.valueOf(guiMaxFreq.getValue()));
		if (guiNormGlobal.isSelected()) {
			config.setNormalization("Global");
		} else if (guiNormIndividual.isSelected()) {
			config.setNormalization("Individual");
		}
		config.setLogTransform(guiLogTransform.isSelected());
		config.setBatchError(guiErrorBatch.isSelected());
		config.setStandardDevs(guiStandardDevs.isSelected());
		config.setAudioOutput(guiOutputAudioMP3.isSelected());
		config.setExcelOutput(guiOutputExcel.isSelected());
		config.setTDOutput(guiOutputTD.isSelected());

		config.setGraphTitle(graphTitleTxt.getText());
		config.setxAxisTitle(xAxisTitleTxt.getText());
		config.setyAxisTitle(yAxisTitleTxt.getText());
		config.setyAxisMin(yMinValueTxt.getText());
		if (dataFormatComboBox.getSelectedIndex()==3) {
			config.setyAxisMax(String.valueOf(guiMaxFreq.getValue()));	// if Hz data format, set y Max to max Freq.
			config.setyAxisMin("0"); // guiMinFreq.getValue(). Using 0 for better graph image ( no cutoff bottom data )
		} else {
			config.setyAxisMax(yMaxValueTxt.getText());
		}
		config.setyAxisTicks(yAxisTicksCheckBox.isSelected());
		config.setyTickIntIndex(yTickIntComboBox.getSelectedIndex());
		config.setyTickLabels(yTickLabelsCheckBox.isSelected());
		config.setGraphDataFormatIndex(dataFormatComboBox.getSelectedIndex());
		
		Enumeration<String> sheetNames = INPUT_SHEETS.keys();
		Hashtable<String,ArrayList<String>> sheetConfig = new Hashtable<String,ArrayList<String>>();
		
		while (sheetNames.hasMoreElements()) {
			String shtName = sheetNames.nextElement();
			ArrayList<String> shtConfig = new ArrayList<String>();
			sheetTabPanel stp = INPUT_SHEETS.get(shtName); 
			/*		Code for Row Header Handling
			shtConfig.add(String.valueOf(stp.getRowHeader().isSelected()));
			*/
			if (stp.getDataHeader().getSelectedIndices().length > 0) {	// this means there are selected data columns/rows
				ListModel<String> model = stp.getDataHeader().getModel();
				int[] selIndexes = stp.getDataHeader().getSelectedIndices(); 
				for (int i = 0; i < selIndexes.length; ++i) {
					shtConfig.add(model.getElementAt(selIndexes[i]));
				}
				sheetConfig.put(shtName, shtConfig);
			}
		}
		
		if (!sheetConfig.isEmpty()) {
			config.setDataSheets(sheetConfig);
		}
		
		return config;
	}
	
	public int saveDialogue() {
		int returnVal = JOptionPane.showConfirmDialog(frmAudiofyData, "The current action will change existing Configurations.\n\nDo you wish to continue?",
		"Configurations Not Saved",JOptionPane.YES_NO_OPTION);
		if (returnVal != 0) {
			return 1;
		}
		return returnVal;
	}
	
	public ArrayList<sheetTabPanel> loadInputFile(String fileName) throws Exception {
		// Validate File Name
		{
			String[] strArray = fileName.split("[.]");
			if (strArray.length <= 1 || (!strArray[strArray.length-1].toUpperCase().equals("XLSX") &&
			!strArray[strArray.length-1].toUpperCase().equals("XLS"))) {
				throw new IOException(fileName + " - Not a Valid Excel Input File. (" + strArray.length + ")");
			}
		}
		File file = new File(fileName);
		if (!file.isFile()) {
			throw new IOException("Not a Valid Excel Input File.");
		}
		
		// Close old variables if needed
		if(inputWB != null) {
			inputWB.close();
			inputWB = null;
		}
		
		if(FIS != null) {
			FIS.close();
			FIS = null;
		}
		
		// Open the Excel File
		ArrayList<sheetTabPanel> STP = new ArrayList<sheetTabPanel>();
		FIS = new FileInputStream(file);
		inputWB = new XSSFWorkbook(FIS);
		
		// Loop through Spreadsheets and create the Display Structure
		for (int i=0; i < inputWB.getNumberOfSheets(); ++i) {
			String sheetName = inputWB.getSheetName(i);
			ArrayList<String> dataList = new ArrayList<String>();
			boolean allTxtCol = true;
			boolean allTxtRow = false;
			XSSFSheet sheet = inputWB.getSheet(sheetName);
			Row row = sheet.getRow(0);
			for (int j=0; j < row.getLastCellNum(); ++j) {
				Cell cell = row.getCell(j);
				if (!cell.getCellType().toString().toUpperCase().equals("STRING")) {
					allTxtRow = false;
					break;
				}
			}
			for (int j=0; j < sheet.getLastRowNum(); ++j) {
				row = sheet.getRow(j);
				Cell cell = row.getCell(0);
				if (!cell.getCellType().toString().toUpperCase().equals("STRING")) {
					allTxtCol = false;
					break;
				}
			}
			if ((allTxtCol && allTxtRow) || (!allTxtCol && !allTxtRow)) {
				row = sheet.getRow(0);
				if (sheet.getLastRowNum() >= row.getLastCellNum()) {
					allTxtRow = true;
					allTxtCol = false;
				} else if (sheet.getLastRowNum() < row.getLastCellNum()) {
					allTxtCol = true;
					allTxtRow = false;
				}
			}
			
			dataList = genHeaderList(allTxtCol, allTxtRow, sheet);

			sheetTabPanel stp = new sheetTabPanel(this, sheetName, i);
			stp.setHeaderStats(genSheetStats(allTxtCol, allTxtRow, sheet));
			stp.spreadsheetUpdate(allTxtRow, true, dataList);
			for(int j=0;j<dataList.size();j++) {
				stp.setWBHeaderIndex(dataList.get(j),j);
			}
			STP.add(stp);			
		}
				
		// Return the data structure
		return STP;
	}

	public void updateSpreadsheetGUI(boolean rowHeader, boolean force, String sheetName) throws Exception {
		sheetTabPanel stp = INPUT_SHEETS.get(sheetName);
		ArrayList<String> dataList = new ArrayList<String>();
		if(inputWB == null) {
			// Close old FIS if needed
			if(FIS != null) {
				FIS.close();
				FIS = null;
			}
			
			File file = new File(guiInputFile.getText());
			FIS = new FileInputStream(file);
			inputWB = new XSSFWorkbook(FIS);
		}
		
		boolean colHeader = false;
		if (!rowHeader) {
			colHeader = true;
		}
		dataList = genHeaderList(rowHeader, colHeader, inputWB.getSheet(sheetName));
		
		stp.spreadsheetUpdate(rowHeader, force, dataList);
		for(int i=0;i<dataList.size();i++) {
			stp.setWBHeaderIndex(dataList.get(i),i);
		}
		INPUT_SHEETS.put(sheetName, stp);
	}
	
	public String excelColumnName(int colNumber) {
		String[] strArray = new String[]{"A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"}; 
		String name = ""; 	// 27 = AB
		int alpha = ((colNumber+1) / strArray.length) - 1;	// intended length of 26
		int beta = (colNumber+1) % strArray.length - 1;
		name = strArray[beta];
		if (alpha >= 0) {
			name = strArray[alpha] + name;
		}
		
		return name;
	}
	
	public Hashtable<String,double[]> genSheetStats(boolean allTxtCol, boolean allTxtRow, XSSFSheet sheet) throws DataFormatException {
		Hashtable<String,double[]> statList = new Hashtable<String,double[]>();
		Row row = null;
		
		if ((allTxtCol && !allTxtRow) || (!allTxtCol && allTxtRow)) {
			if (allTxtRow) {
				Row headRow = sheet.getRow(0);
				for(int i=0;i<headRow.getLastCellNum(); i++) {
					Cell cell = headRow.getCell(i);
					String hName = cellValueToString(cell);
					double[] vals = new double[] { 0.0, 0.0, sheet.getLastRowNum(), 0.0, 0.0, 0.0, 0.0 }; // min, max, count, sum, sum sqr, std_dev, sq_std_dev
					
					for(int j=1;j<=sheet.getLastRowNum();j++) {
						row = sheet.getRow(j);
						cell = row.getCell(i);
						if(cell != null) {
							try {
								double value = cell.getNumericCellValue();
								vals[3] += value;
								vals[4] += (value * value);
								if(j == 1) {
									vals[0] = value;
									vals[1] = value;
								}
								if(vals[0] > value) { vals[0] = value; }
								if(vals[1] < value) { vals[1] = value; }
							} catch (Exception E) {
								throw new DataFormatException ("Spreadsheet " + sheet.getSheetName() + " row " + j + " column " + i + 
									" is not a valid number");
							}
						}
					} // for j
					
					statList.put(hName, vals);
				} // for i
				
				if(guiStandardDevs.isSelected()) {
					for(int i=0;i<headRow.getLastCellNum(); i++) {
						Cell cell = headRow.getCell(i);
						String hName = cellValueToString(cell);
						double[] vals = statList.get(hName);
						double mean = vals[3] / vals[2];
						double sq_mean = vals[4] / (vals[2] * vals[2]);
						double sum_mean = 0.0;
						double sq_sum_mean = 0.0;
						
						for(int j=1;j<=sheet.getLastRowNum();j++) {
							row = sheet.getRow(j);
							cell = row.getCell(i);
							if(cell != null) {
								try {
									double value = cell.getNumericCellValue();
									double mD = (value - mean) * (value - mean);
									double sq_mD = ((value*value)-sq_mean) * ((value*value)-sq_mean);
									sum_mean += mD;
									sq_sum_mean += sq_mD;
								} catch (Exception E) {
									throw new DataFormatException ("Spreadsheet " + sheet.getSheetName() + " row " + j + " column " + i + 
										" is not a valid number.");
								}
							}
						} // for j
						
						sum_mean /= vals[2];
						sq_sum_mean /= vals[2];
						
						vals[5] = Math.sqrt(sum_mean);
						vals[6] = Math.sqrt(sq_sum_mean);
						
						statList.put(hName, vals);
					} // for i					
				}
			} else {	// allTxtCol
				for (int j=0; j <= sheet.getLastRowNum(); ++j) {
					row = sheet.getRow(j);
					double[] vals = new double[] { 0.0, 0.0, sheet.getLastRowNum(), 0.0, 0.0, 0.0, 0.0 }; // min, max, count, sum, sum sqr, std_dev, sq_std_dev
					Cell cell = row.getCell(0);
					String hName = cellValueToString(cell);
					
					for(int i=1;i<row.getLastCellNum();i++) { 
						cell = row.getCell(i);
						try {
							double value = cell.getNumericCellValue();
							vals[3] += value;
							vals[4] += (value * value);
							if(i == 1) {
								vals[0] = value;
								vals[1] = value;
							}
							if(vals[0] > value) { vals[0] = value; }
							if(vals[1] < value) { vals[1] = value; }
						} catch (Exception E) {
							throw new DataFormatException ("Spreadsheet " + sheet.getSheetName() + " row " + j + " column " + i + 
								" is not a valid number");
						}
					}
					statList.put(hName, vals);
				}
				
				if(guiStandardDevs.isSelected()) {
					for (int j=0; j <= sheet.getLastRowNum(); ++j) {
						row = sheet.getRow(j);
						Cell cell = row.getCell(0);
						String hName = cellValueToString(cell);
						double[] vals = statList.get(hName);
					
						double mean = vals[3] / vals[2];
						double sq_mean = vals[4] / (vals[2] * vals[2]);
						double sum_mean = 0.0;
						double sq_sum_mean = 0.0;
						
						for(int i=1;i<row.getLastCellNum();i++) { 
							cell = row.getCell(i);
							if(cell != null) {
								try {
									double value = cell.getNumericCellValue();
									double mD = (value - mean) * (value - mean);
									double sq_mD = ((value*value)-sq_mean) * ((value*value)-sq_mean);
									sum_mean += mD;
									sq_sum_mean += sq_mD;
								} catch (Exception E) {
									throw new DataFormatException ("Spreadsheet " + sheet.getSheetName() + " row " + j + " column " + i + 
										" is not a valid number.");
								}
							}
						} // for ji
						
						sum_mean /= vals[2];
						sq_sum_mean /= vals[2];
						
						vals[5] = Math.sqrt(sum_mean);
						vals[6] = Math.sqrt(sq_sum_mean);
						
						statList.put(hName, vals);
					} // for i					
				}
			}
		}
		
		return statList;
	}
	
	public ArrayList<String> genHeaderList (boolean allTxtCol, boolean allTxtRow, XSSFSheet sheet) throws DataFormatException {
		ArrayList<String> dataList = new ArrayList<String>();
		Row row = null;
		if ((allTxtCol && !allTxtRow) || (!allTxtCol && allTxtRow)) {
			if (allTxtRow) {
				row = sheet.getRow(0);
				for (int j=0; j < row.getLastCellNum(); ++j) {
					Cell cell = row.getCell(j);
					String hName = cellValueToString(cell);
					if (hName.isEmpty()) {
						throw new DataFormatException("Column Header " + excelColumnName(j) + " is blank.");
					} else if (dataList.contains(hName)) {
						throw new DataFormatException("Column Header " + excelColumnName(j) + " is a duplicate.");
					}
					dataList.add(hName);
				}
			} else {	// allTxtCol
				for (int j=0; j <= sheet.getLastRowNum(); ++j) {
					row = sheet.getRow(j);
					Cell cell = row.getCell(0);
					String hName = cellValueToString(cell);
					if (hName.isEmpty()) {
						throw new DataFormatException("Row Header " + j+1 + " is blank.");
					} else if (dataList.contains(hName)) {
						throw new DataFormatException("Row Header " + j+1 + " is a duplicate.");
					}
					dataList.add(hName);
				}
			}
		}
		return dataList;
	}
	
	public double[] getGlobalMinMax() {
		double[] minmax = new double[] { 0.0, 0.0 };
		boolean first = true;
		
		Enumeration<String> keys = INPUT_SHEETS.keys();
		while(keys.hasMoreElements()) {
			sheetTabPanel stp = INPUT_SHEETS.get(keys.nextElement());
			double[] mm = stp.getGlobalMinMaxValues();
			if(mm[0] < minmax[0] || first) {
				minmax[0] = mm[0];
			}
			if(mm[1] > minmax[1] || first) {
				minmax[1] = mm[1];
			}
			first = false;
		}
		
		return minmax;
	}
	
	public ArrayList<dataSourceStructure> getDSSList() throws DataFormatException {
		ArrayList<dataSourceStructure> DSS = new ArrayList<dataSourceStructure>();
		
		Enumeration<String> keys = INPUT_SHEETS.keys();
		while(keys.hasMoreElements()) {
			String sheetName = keys.nextElement();
			sheetTabPanel stp = INPUT_SHEETS.get(sheetName);
			DSS.addAll(stp.getDSSList(DP.get_dataColorModel(), DP.get_dataTableModel()));
		}
			// TODO : recursive call above??
		return DSS;
	}
	
	public void updateDPvariables() throws DataFormatException {
		Enumeration<String> keys = INPUT_SHEETS.keys();
		List<String> variables = new ArrayList<String>();
		while(keys.hasMoreElements()) {
			String sheetName = keys.nextElement();
			sheetTabPanel stp = INPUT_SHEETS.get(sheetName);
			List<String> list = stp.getSelectedVariables();
			for(int i=0;i<list.size();i++) {
				variables.add((sheetName + "-" + list.get(i)));
			}
		}
		Collections.sort(variables);
		DP.update_variables(variables);
	}
	
	public String cellValueToString(Cell cell) {
		if (cell.getCellType().toString().toUpperCase().equals("BOOLEAN")) {
			return String.valueOf(cell.getBooleanCellValue());
		} else if (cell.getCellType().toString().toUpperCase().equals("NUMERIC")) {
			return String.valueOf(cell.getNumericCellValue());
		} else if (cell.getCellType().toString().toUpperCase().equals("STRING")) {
			return cell.getStringCellValue();
		}
		return "";
	}
	
	public void displayMessage(String title, String message) {
		JOptionPane.showMessageDialog(frmAudiofyData, message, title, JOptionPane.INFORMATION_MESSAGE);
	}
	
	public void displayErrorMSG(Exception E) {
		JOptionPane.showMessageDialog(frmAudiofyData, E.getMessage(), "Error Alert", JOptionPane.ERROR_MESSAGE);
	}

	public int getBORDER_SIZE() {
		return BORDER_SIZE;
	}
	
	public FileWriter getTDOutputWriter() {
		return TDOutputWriter;
	}

	public void createTDOutputWriter() {
		try {
			File outputTDFile = new File(guiOutputFile.getText() + "//AudioFY_TabDelim_RENAME.txt");
			outputTDFile.createNewFile();
			TDOutputWriter = new FileWriter(outputTDFile);
			TDOutputWriter.write("varName\tRaw\tNormalized\tLogTransform\tProportional\tHz\tStdDev\tSqStdDev\n");
		} catch (IOException e) {
            System.out.print(e.getMessage());
        }
	}
	
	public void writeToTDOutputFile(String varName, double[] varData) { 	// TODO : TD Output needs var name in 1st column and other values shifted right 
		String outputLine = varName + "\t";
		for (int i=0; i<varData.length; ++i) {
			outputLine += String.valueOf(varData[i]) + "\t";
		}
		outputLine += "\n";
		try {
			TDOutputWriter.write(outputLine);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	public void createXLOutputSHTS() {
		for(int i=0; i<DP.getDTM().getRowCount(); i++) {
			String vName = (String)DP.getDTM().getValueAt(i, 0);
			outputSHT = outputWB.createSheet(vName);
			String[] colNames = DP.getColumnNames();
			XSSFRow r = outputSHT.createRow(0);
			for (int j=0; (j<colNames.length - 2); ++j) {
				XSSFCell c = r.createCell(j);
				c.setCellValue(colNames[j+2]);
				outputSHT.autoSizeColumn(j);
			}
		}
	}

	public XSSFWorkbook getOutputWB() {
		return outputWB;
	}

	public void setOutputWB(XSSFWorkbook outputWB) {
		this.outputWB = outputWB;
	}

	public XSSFSheet getOutputSHT() {
		return outputSHT;
	}

	public void setOutputSHT(XSSFSheet outputSHT) {
		this.outputSHT = outputSHT;
	}
	
	public void writeToXLOutputWB(int sheetNum, double[] varData) {
		outputSHT = outputWB.getSheetAt(sheetNum);
		XSSFRow r = outputSHT.createRow(PTHREAD.getCurrentIndex() + 1);
		for (int j=0; (j<varData.length); ++j) {
			XSSFCell c = r.createCell(j);
			c.setCellValue(varData[j]);	// j+2 skips first 2 columns (var name, graph color)
		}
	}
	
	public void publishXLOutputWB() {
        try {
			String FILE_OUT_NAME = guiOutputFile.getText() + "//AudioFY_Excel_RENAME.xlsx";
			FileOutputStream outputStream = new FileOutputStream(FILE_OUT_NAME);
			outputWB.write(outputStream);
	        outputStream.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
	public ArrayList<byte[]> getAudioOutputTones() {
		return audioOutputTones;
	}

	public ArrayList<AudioFormat> getAudioOutputAFs() {
		return audioOutputAFs;
	}

	public void createAudioOutputStorage() {
		audioOutputTones = new ArrayList<byte[]>();
		audioOutputAFs = new ArrayList<AudioFormat>();
	}
	
	public void saveAudioBytesToFile(File outputFile) {    
		AudioInputStream masterClip = null;
        for (int i=0; i<audioOutputTones.size() - 1; ++i) {
			
            try {
	        	String wavFile1 = guiOutputFile.getText() + "//AudioFY_Audio_temp1.wav";
	            String wavFile2 = guiOutputFile.getText() + "//AudioFY_Audio_temp2.wav";
	            

	            // clip 2:
	    		InputStream audio2 = new ByteArrayInputStream(audioOutputTones.get(i + 1));
	            AudioInputStream clip2 = new AudioInputStream(
	            		audio2, 
	            		audioOutputAFs.get(i + 1), 
	            		(long) (audioOutputTones.get(i + 1).length)
	            );
	            //AudioSystem.write(clip2, AudioFileFormat.Type.WAVE, new File(wavFile2));
                //clip2 = AudioSystem.getAudioInputStream(new File(wavFile2));
                AudioInputStream clip1 = null;

	            //clip 1:
	            if (i == 0) {	// first 
	                InputStream audio1 = new ByteArrayInputStream(audioOutputTones.get(i));
	                clip1 = new AudioInputStream(
		            		audio1, 
		            		audioOutputAFs.get(i),
		            		(long) (audioOutputTones.get(i).length)
		            );
					//AudioSystem.write(clip1, AudioFileFormat.Type.WAVE, new File(wavFile1));
	                //clip1 = AudioSystem.getAudioInputStream(new File(wavFile1));
	            } else {
	            	clip1 = masterClip;
					//AudioSystem.write(clip1, AudioFileFormat.Type.WAVE, new File(wavFile1));
	                //clip1 = AudioSystem.getAudioInputStream(outputFile);
	            }

	            //appendedFiles
	                AudioInputStream appendedFiles = new AudioInputStream(
	                                    new SequenceInputStream(clip1, clip2),     
	                                    clip1.getFormat(), 
	                                    clip1.getFrameLength() + clip2.getFrameLength());
	                System.out.println("clip1 frameLength: " + clip1.getFrameLength() + "\t clip2 frameLength: " + clip2.getFrameLength()
	                + "\t appendedClip frameLength: " + appendedFiles.getFrameLength());
	                masterClip = appendedFiles;

	                if (i != audioOutputTones.size()-2) {
	                	AudioSystem.write(clip1, AudioFileFormat.Type.WAVE, new File(wavFile1));
	                	AudioSystem.write(clip2, AudioFileFormat.Type.WAVE, new File(wavFile2));
	                }
	                clip1.close();
	                clip2.close();
	            	if (i == audioOutputTones.size()-2) {
	            		AudioSystem.write(masterClip, AudioFileFormat.Type.WAVE, outputFile);
	            	}
            } catch (Exception e) {
                e.printStackTrace();
            }
        	

        	
        	
        	
        	
        	
        	
        	
        	
        	/*try {
        		AudioInputStream clip1;
        		InputStream audio2 = new ByteArrayInputStream(audioOutputTones.get(i + 1));
	            AudioInputStream clip2 = new AudioInputStream(
	            		audio2, 
	            		audioOutputAFs.get(i + 1), 
	            		(long) (audioOutputTones.get(i + 1).length)
	            );
        		if (i==0) {	// if first clips, input stream directly from clips (not pre existing output file)
        			InputStream audio1 = new ByteArrayInputStream(audioOutputTones.get(i));
        			clip1 = new AudioInputStream(
    	            		audio1, 
    	            		audioOutputAFs.get(i), 
    	            		(long) (audioOutputTones.get(i).length)
    	            );
        		} else {
        			clip1 = AudioSystem.getAudioInputStream(outputFile);
        			System.out.println("audioOutputTones(i) length: " + audioOutputTones.get(i).length + "\t audioOutputAFs(i) frameRate: " + 
        					audioOutputAFs.get(i).getFrameRate());
        		}
	            AudioInputStream appendedFiles = new AudioInputStream(
	                                new SequenceInputStream(clip1, clip2),     
	                                audioOutputAFs.get(i), 
	                                clip1.getFrameLength() + clip2.getFrameLength()
	            );
	            //outputFile.delete();
	            //AudioSystem.write(appendedFiles, AudioFileFormat.Type.WAVE, outputFile);
	            AudioSystem.write(clip2, AudioFileFormat.Type.WAVE, outputFile);
        	} catch (Exception e) {
        		e.printStackTrace();
        	}*/
    	}


    }
	
	public void publishOutputs(Configurations CONFIG) {	// TODO : add to this for audio/video outputs
		if (CONFIG.isExcelOutput()) {
			publishXLOutputWB();
			outputWB = null;
			outputSHT = null;
		}
		/*if (CONFIG.isTDOutput()) {
			try {
				TDOutputWriter.close();
			} catch (IOException e) {
				e.printStackTrace();
			}
		}*/
		if (CONFIG.isAudioOutput()) {
			String FILE_OUT_NAME = guiOutputFile.getText() + "//AudioFY_Audio_RENAME.wav";
			File output = new File(FILE_OUT_NAME);
			saveAudioBytesToFile(output);
			
			audioOutputTones = null;
			audioOutputAFs = null;
		}
		
	}
}
