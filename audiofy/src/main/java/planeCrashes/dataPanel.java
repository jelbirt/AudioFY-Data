/* @Author Jacob Elbirt
*	AudioFY Project created during 2023 Summer Aisiku Research Fellowship
*	Not intended for commercial use
*/

package planeCrashes;

import javax.swing.JColorChooser;
import javax.swing.JFrame;
import javax.swing.JPanel;
import java.awt.GridBagLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.GridBagConstraints;
import javax.swing.JTable;
import javax.swing.table.TableColumn;

import java.awt.Insets;
import java.awt.Point;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.awt.event.MouseMotionListener;
import java.util.Hashtable;
import java.util.List;
import java.util.Random;
import java.util.zip.DataFormatException;
import javax.swing.JScrollPane;

public class dataPanel extends JPanel implements MouseListener, MouseMotionListener {
	private static final long serialVersionUID = 1L;
	private playPanel PP = null;
	private JFrame PW = null;
	private AudioFY AF = null;
	private JTable table;
	private Point initialClick;
	private int borderSize = 5;
	private boolean resize = false;
	private Point mdLastPos = new Point();
	private Point oriPWSize = new Point();
	private int sizeGrowRate = 1;
	private int minSize = 50;
	private String[] columnNames = {"Variable","Graph Color","Raw","Normalized","Log","Proporitional","Hz","Std Dev","Sq Std Dev"};
	private dataTableModel DTM = new dataTableModel(columnNames, new Object[][] {{"-","-","-","-","-","-","-","-","-"}});
	private ToneButtonControlPanel tbcPanel = null;
	private dataTableCellColorRenderer DTR = null;
	private ColorUtils CU = null;
	private Random RANDOM = new Random(System.currentTimeMillis());
	
	public dataPanel(JFrame parentWindow, int bordersize, ColorUtils cu, AudioFY af) {
		super();
		borderSize = bordersize;
		CU = cu;
		DTR = new dataTableCellColorRenderer(CU);
		AF = af;
		this.addMouseListener(this);
		this.addMouseMotionListener(this);
		PW = parentWindow;
		GridBagLayout gridBagLayout = new GridBagLayout();
		gridBagLayout.columnWidths = new int[]{0, 0};
		gridBagLayout.rowHeights = new int[]{0, 0, 0};
		gridBagLayout.columnWeights = new double[]{1.0, Double.MIN_VALUE};
		gridBagLayout.rowWeights = new double[]{1.0, 0.0, Double.MIN_VALUE};
		setLayout(gridBagLayout);
		
		table = new JTable();
		table.setModel(DTM);
		table.addMouseListener(new MouseAdapter() {
		    @Override public void mouseClicked(MouseEvent evt) {
		        int row = table.rowAtPoint(evt.getPoint());
		        int col = table.columnAtPoint(evt.getPoint());

		        if (col == 1) {
		        	Color initialcolor = Color.white;
		        	if(DTR.getBackgroundColor(row) != null) {
		        		initialcolor = DTR.getBackgroundColor(row);
		        	}

		        	Color color = JColorChooser.showDialog(PW,"Select a color",initialcolor);
		        	if(color == null) {
		        		return;
		        	}
		        	try {
		        		DTR.setBackgroundColor(color, row);
		        		DTM.setValueAt(CU.getColorNameFromColor(color), row, col);
			        	table.updateUI();
			        	AF.setNeedSave(true);
		        	} catch(DataFormatException e) {
		        		AF.displayErrorMSG(e);
		        	}
		        }
		    }
		});

		TableColumn tColumn = table.getColumnModel().getColumn(1);
	    tColumn.setCellRenderer(DTR);
	    table.getTableHeader().setReorderingAllowed(false);
		table.setRowSelectionAllowed(false);
		table.setCellSelectionEnabled(false);
		table.setColumnSelectionAllowed(false);
		table.addMouseListener(this);
		table.addMouseMotionListener(this);
		
		JScrollPane scrollPane = new JScrollPane();
		scrollPane.setViewportView(table);
		GridBagConstraints gbc_scrollPane = new GridBagConstraints();
		gbc_scrollPane.fill = GridBagConstraints.BOTH;
		gbc_scrollPane.insets = new Insets(0, 0, 5, 0);
		gbc_scrollPane.gridx = 0;
		gbc_scrollPane.gridy = 0;
		add(scrollPane, gbc_scrollPane);
		
		tbcPanel = new ToneButtonControlPanel(PP);
		tbcPanel.addMouseListener(this);
		tbcPanel.addMouseMotionListener(this);
		GridBagConstraints gbc_panel = new GridBagConstraints();
		gbc_panel.fill = GridBagConstraints.BOTH;
		gbc_panel.gridx = 0;
		gbc_panel.gridy = 1;
		add(tbcPanel, gbc_panel);
	}
	
	public Color[] getColorList() {
		return DTR.getColors();
	}

	public void setColorList(Color[] list) {
		DTR.setColors(list);
		DTM.fireTableDataChanged();
		table.repaint();
	}
	
	public void setPlayPanel(playPanel pp) {
		PP = pp;
		tbcPanel.setPlayPanel(pp);
	}
	
	public dataTableModel get_dataTableModel() {
		return DTM;
	}
	
	public dataTableCellColorRenderer get_dataColorModel() {
		return DTR;
	}
	
	public void resetDataTable() {
		System.out.println("im running");
		set_data(new Object[][] {{"-","-","-","-","-","-","-","-","-"}});
		table.setModel(DTM);
		DTM.fireTableDataChanged();
		table.repaint();
		
	}
	
	public void set_columnHeaders(String[] columnHeaders) {
		DTM.setColumnNames(columnHeaders);
		table.setModel(DTM);
		DTM.fireTableDataChanged();
		table.repaint();
	}
	
	public void update_display_data(Hashtable<String,double[]> data) {
		for(int i=0;i<DTM.getRowCount();i++) {
			String vName = (String)DTM.getValueAt(i, 0); // first column variable name
			if(data.containsKey(vName)) {
				double[] vD = data.get(vName); // raw, normalized, log(), Proportional, Hz, Std Dev, Sq Std Dev
				for(int j=0;j<vD.length;j++) {
					DTM.setValueAt(vD[j], i, (j+2));	// (j+2) accounts for the first 2 columns in DTM/DP (var name, graph color)
				}
				
				// OUTPUTS:
				if (PP.getCONFIG().isExcelOutput()) { 
					AF.writeToXLOutputWB(i, vD);
				}
				if (PP.getCONFIG().isTDOutput()) {
					AF.writeToTDOutputFile(vName, vD);
				}
				
			} else {
				for(int j=2;j<columnNames.length;j++) {
					DTM.setValueAt("-", i, j);
				}
			}
		}
		table.setModel(DTM);
		DTM.fireTableDataChanged();
		table.repaint();
	}
	
	public void set_data(Object[][] displayData) {
		DTM.setData(displayData);
		table.setModel(DTM);
		DTM.fireTableDataChanged();
		table.repaint();
	}
	
	public void update_variables(List<String> variables) throws DataFormatException {
		Object[][] data = new Object[variables.size()][columnNames.length];
		Color[] colors = new Color[variables.size()];
		for(int i=0;i<variables.size();i++) {
			data[i][0] = variables.get(i);
			
			if(DTR.getBackgroundColor(i) != null) {
				data[i][1] = CU.getColorNameFromColor(DTR.getBackgroundColor(i));
				colors[i] = DTR.getBackgroundColor(i);
			} else {
				Color rColor = new Color((int)(RANDOM.nextDouble() * 255),(int)(RANDOM.nextDouble() * 255),(int)(RANDOM.nextDouble() * 255));
				while(DTR.hasColor(rColor)) {
					rColor = new Color((int)(RANDOM.nextDouble() * 255),(int)(RANDOM.nextDouble() * 255),(int)(RANDOM.nextDouble() * 255));
				}
				colors[i] = rColor;
				data[i][1] = CU.getColorNameFromColor(rColor);
			}
			
			for(int j=2;j<columnNames.length;j++) {
				data[i][j] = "-";
			}
		}

		if(DTR.getColors().length > colors.length) {
			Color[] newList = new Color[DTR.getColors().length];
			for(int i=0;i<DTR.getColors().length;i++) {
				if(colors.length > i) {
					newList[i] = colors[i];
				} else {
					newList[i] = DTR.getColors()[i];
				}
			}
			colors = newList;
		}

		DTR.setColors(colors);
		DTM.setData(data);
		DTM.fireTableDataChanged();
		table.repaint();
	}
	
	public void mouseDragged(MouseEvent e) {
		Point mdCurrentPos = e.getPoint();
		boolean negX = false;
		boolean negY = false;
		
		if (mdLastPos.x - mdCurrentPos.x > 0) {
			negX = true;
		}
		if (mdLastPos.y - mdCurrentPos.y > 0) {
			negY = true;
		}
		                
		if(resize) {
			if (initialClick.getX() <= borderSize) {	// Left border				
				if (negX) {	// Grow X
					PW.setSize(new Dimension(PW.getWidth()+sizeGrowRate, PW.getHeight()));
					PW.setLocation(new Point(PW.getLocation().x-sizeGrowRate,PW.getLocation().y));
				} else {	// xMoved > 0 --> Shrink X
					if (PW.getWidth() - sizeGrowRate < minSize) {
						return;
					}
					PW.setSize(new Dimension(PW.getWidth()-sizeGrowRate, PW.getHeight()));
					PW.setLocation(new Point(PW.getLocation().x+sizeGrowRate,PW.getLocation().y));
				}
			} else if (initialClick.getY() <= borderSize) {	// Top border
				if(negY) { // grow
					PW.setSize(new Dimension(PW.getWidth(), PW.getHeight()+sizeGrowRate));
					PW.setLocation(new Point(PW.getLocation().x,PW.getLocation().y-sizeGrowRate));
				} else { // shrink
					if (PW.getHeight() - sizeGrowRate < minSize) {
						return;
					}
					PW.setSize(new Dimension(PW.getWidth(), PW.getHeight()-sizeGrowRate));
					PW.setLocation(new Point(PW.getLocation().x,PW.getLocation().y+sizeGrowRate));
				}
			} else if (initialClick.getX() >= (oriPWSize.x - borderSize)) {	// Right border
				if (negX) {	// Shrink X
					if (PW.getWidth() - sizeGrowRate < minSize) {
						return;
					}
					PW.setSize(new Dimension(PW.getWidth()-sizeGrowRate, PW.getHeight()));
				} else {	// xMoved > 0 --> Grow X			752 + (752 
					PW.setSize(new Dimension(PW.getWidth()+sizeGrowRate, PW.getHeight()));
				}
			} else {	// y > height - borderSize --> Bottom border
				if(negY) { // shrink
					if (PW.getHeight() - sizeGrowRate < minSize) {
						return;
					}
					PW.setSize(new Dimension(PW.getWidth(), PW.getHeight()-sizeGrowRate));
				} else { // grow
					PW.setSize(new Dimension(PW.getWidth(), PW.getHeight()+sizeGrowRate));
				}
			}
			return;
		}
		
		// get location of Window
        int thisX = PW.getLocation().x;
        int thisY = PW.getLocation().y;
        
	    // Determine how much the mouse moved since the initial click
        int xMoved = e.getX() - initialClick.x;
        int yMoved = e.getY() - initialClick.y;
 
        // Move window to this position
        int X = thisX + xMoved;
        int Y = thisY + yMoved;
        PW.setLocation(X, Y);
	}

	public void mouseMoved(MouseEvent e) {
		//System.out.println("mouseMoved : " + e.getX() + "," + e.getY()); -- Unit Test Code
	}

	public void mouseClicked(MouseEvent e) {
		//System.out.println("mouseClicked : " + e.getX() + "," + e.getY()); -- Unit Test Code
    }


	public void mousePressed(MouseEvent e) {
		initialClick = e.getPoint();
		mdLastPos = e.getPoint();
		oriPWSize.setLocation(PW.getWidth(),PW.getHeight());

		if (initialClick.getX() <= borderSize || initialClick.getY() <= borderSize || initialClick.getX() >= (oriPWSize.x - borderSize)
		|| initialClick.getY() >= (oriPWSize.y  - borderSize)) {
			resize = true;
		} else {
			resize = false;
		}
		//System.out.println("mousePressed : " + e.getX() + "," + e.getY()); -- Unit Test Code
	}

	public void mouseReleased(MouseEvent e) {
		//System.out.println("mouseReleased : " + e.getX() + "," + e.getY()); -- Unit Test Code
	}

	public void mouseEntered(MouseEvent e) {
		//System.out.println("mouseEntered : " + e.getX() + "," + e.getY());
	}

	public void mouseExited(MouseEvent e) {
		//System.out.println("mouseExited : " + e.getX() + "," + e.getY());
	}

	public String[] getColumnNames() {
		return columnNames;
	}

	public dataTableModel getDTM() {
		return DTM;
	}

	
}
