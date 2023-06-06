// Copyright (c) 2023 Joel Klinghed, see LICENSE file.

#include <cstdint>
#include <fstream>
#include <iostream>
#include <string>
#include <string_view>
#include <vector>

namespace {

uint32_t u8_read(std::string_view str, size_t& offset) {
  uint32_t c;
  switch (str[offset] >> 4) {
    case 15:
      c = ((static_cast<uint32_t>(str[offset] & 0x07)) << 18)
          | ((static_cast<uint32_t>(str[offset + 1] & 0x3f)) << 12)
          | ((static_cast<uint32_t>(str[offset + 2] & 0x3f)) << 6)
          | (str[offset + 3] & 0x3f);
      offset += 4;
      break;
    case 14:
      c = ((static_cast<uint32_t>(str[offset] & 0x0f)) << 12)
          | ((static_cast<uint32_t>(str[offset + 1] & 0x3f)) << 6)
          | (str[offset + 2] & 0x3f);
      offset += 3;
      break;
    case 13:
    case 12:
      c = ((static_cast<uint32_t>(str[offset] & 0x1f)) << 6)
          | (str[offset + 1] & 0x3f);
      offset += 2;
      break;
    default:
      c = str[offset++] & 0x7f;
      break;
  }
  return c;
}

void write_u32(std::ostream& out, uint32_t value) {
  uint8_t tmp[4];
  tmp[0] = value >> 24;
  tmp[1] = value >> 16;
  tmp[2] = value >> 8;
  tmp[3] = value;
  out.write(reinterpret_cast<char*>(tmp), sizeof(tmp));
}

struct Node {
  uint32_t c;
  std::vector<size_t> children;
  bool leaf{false};

  explicit Node(uint32_t c)
      : c(c) {}
};

class Tree {
 public:
  Tree() {
    nodes_.emplace_back(0);
  }

  void insert(std::string_view str) {
    insert(str, 0, nodes_[0]);
  }

  bool validate() const {
    return validate(nodes_[0]);
  }

  void write(std::ostream& out) const {
    write(out, nodes_[0], 0);
  }

 private:
  bool validate(Node const& node) const {
    // Using the first 5 bits to node encoding, but Unicode should be happy
    // stopping at U+10FFFF for the time being.
    if (node.c > 0x7fffff) {
      std::cerr << "Node with too large character " << node.c << std::endl;
      return false;
    }
    if (node.children.size() > 255) {
      std::cerr << "Node with too many children "
                << node.children.size() << std::endl;
      return false;
    }
    for (auto child : node.children) {
      if (!validate(nodes_[child]))
        return false;
    }
    return true;
  }

  size_t write(std::ostream& out, Node const& node, size_t offset) const {
    write_u32(out,
              (static_cast<uint32_t>(node.children.size()) << 24) |
              (node.leaf ? 0x800000 : 0) |
              node.c);
    offset += 4;
    if (!node.children.empty()) {
      size_t child_offset = 0;
      bool first = true;
      for (auto child_index : node.children) {
        if (first) {
          first = false;
        } else {
          write_u32(out, child_offset);
          offset += 4;
        }
        auto child_size = size(nodes_[child_index]);
        child_offset += child_size / 4;
      }
      for (auto child_index : node.children) {
        offset = write(out, nodes_[child_index], offset);
      }
    }
    return offset;
  }

  size_t size(Node const& node) const {
    size_t ret = 4;
    if (!node.children.empty()) {
      ret += 4 * (node.children.size() - 1);
      for (auto child : node.children) {
        ret += size(nodes_[child]);
      }
    }
    return ret;
  }

  void insert(std::string_view str, size_t offset, Node& node) {
    if (offset == str.size()) {
      node.leaf = true;
      return;
    }

    uint32_t c = u8_read(str, offset);
    size_t low = 0;
    size_t high = node.children.size();
    while (low < high) {
      size_t mid = (low + high) / 2;
      auto& mid_node = nodes_[node.children[mid]];
      if (mid_node.c == c) {
        insert(str, offset, mid_node);
        return;
      }
      if (c < mid_node.c) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    auto node_index = nodes_.size();
    // Must do this before modifying nodes_ as node ref might become invalid
    node.children.insert(node.children.begin() + high, node_index);
    nodes_.emplace_back(c);
    insert(str, offset, nodes_[node_index]);
  }

  std::vector<Node> nodes_;
};

}  // namespace

int main(int argc, char** argv) {
  if (argc != 3) {
    std::cerr << "Usage: `mktree INPUT OUTPUT`" << std::endl;
    return EXIT_FAILURE;
  }

  std::ifstream in(argv[1]);
  if (!in.good()) {
    std::cerr << "Unable to open " << argv[1] << " for reading." << std::endl;
    return EXIT_FAILURE;
  }

  Tree tree;
  std::string line;
  while (std::getline(in, line)) {
    tree.insert(line);
  }

  if (!tree.validate()) {
    std::cerr << "Unable to generate a tree with the current format."
              << std::endl;
    return EXIT_FAILURE;
  }

  std::ofstream out(argv[2]);
  if (!out.good()) {
    std::cerr << "Unable to open " << argv[2] << " for writing." << std::endl;
    return EXIT_FAILURE;
  }

  tree.write(out);

  return EXIT_SUCCESS;
}
