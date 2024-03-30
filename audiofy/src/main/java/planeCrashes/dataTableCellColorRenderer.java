package planeCrashes;

import java.awt.Color;
import java.awt.Component;
import java.util.zip.DataFormatException;

import javax.swing.JTable;
import javax.swing.table.DefaultTableCellRenderer;

public class dataTableCellColorRenderer extends DefaultTableCellRenderer {
	private static final long serialVersionUID = 1L;
	private Color[] colors = new Color[] { };
	private Color defaultBGColor = Color.white;
	private ColorUtils CU = null;
	
	public dataTableCellColorRenderer(ColorUtils cu) { 
		super();
		CU = cu;
	}
	
	public void setColors(Color[] list) {
		colors = list;
	}
	
	public Color[] getColors() {
		return colors;
	}
	
	public Color getBackgroundColor(String name, dataTableModel DTM) throws DataFormatException {
		int index = DTM.getColorIndex(name);
		if(index < 0) { throw new DataFormatException("Could not find matching name in DTM for DTR getBackgroundColor with " + name); }
		if(index >= colors.length) { throw new DataFormatException("Invalid index " + index + " - colors size " + colors.length + " is too small."); }
		return colors[index];
	}
	
	public Color getBackgroundColor(int id) {
		if(colors.length > id) {
			return colors[id];
		}
		return null;
	}
	
	public boolean hasColor(Color color) {
		for(int i=0;i<colors.length;i++) {
			if(colors[i].getRed() == color.getRed() && colors[i].getGreen() == color.getGreen() && colors[i].getBlue() == color.getBlue()) {
				return true;
			}
		}
		return false;
	}
	
	public void setBackgroundColor(Color color, int id) throws DataFormatException {
		for(int i=0;i<colors.length;i++) {
			if(colors[i].getRed() == color.getRed() && colors[i].getGreen() == color.getGreen() && colors[i].getBlue() == color.getBlue() &&
			i != id) {
				throw new DataFormatException("The color provided is already in use.");
			}
		}
		if(colors.length > id) {
			colors[id] = color;
		} else {
			Color[] newC = new Color[id+1];
			for(int i=0;i<=id;i++) {
				if(colors.length < i) {
					newC[i] = colors[i];
				} else {
					newC[i] = defaultBGColor;
					if(i == id) {
						newC[i] = color;
					}
				}
			}
			colors = newC;
		}
	}

    @Override public Component getTableCellRendererComponent(JTable table, Object value, boolean isSelected, boolean hasFocus, int row, int column) {
		Component c = super.getTableCellRendererComponent(table, value, isSelected, hasFocus, row, column);
		if(colors.length > row && column == 1) {
			c.setBackground(colors[row]);
			double[] distance = CU.distance_wb(colors[row]);
			if(distance[0] < distance[1]) {
				c.setForeground(Color.black);
			} else {
				c.setForeground(Color.white);
			}
		}
		return c;
    }
}
